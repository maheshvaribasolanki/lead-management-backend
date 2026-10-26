import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import type { z } from "zod";

import User, { UserRole, UserStatus } from "../models/User";
import Invitation, {
  InvitationStatus,
} from "../models/Invitation";

import {
  listUsersQuerySchema,
  type UpdateUserInput,
  type ChangeUserRoleInput,
  type ChangeUserStatusInput,
} from "../validators/user.validator";

export type ListUsersQuery = z.infer<
  typeof listUsersQuerySchema
>;

const allowedSortFields = [
  "fullName",
  "email",
  "role",
  "status",
  "createdAt",
  "lastLoginAt",
] as const;

const INVITATION_EXPIRY_HOURS = 24;

/**
 * Escape special regular-expression characters.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * User service error with an HTTP status code.
 */
export class UserServiceError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);

    this.name = "UserServiceError";
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Retrieve users with search, filters, sorting, and pagination.
 */
export async function listUsers(query: ListUsersQuery) {
  const {
    page,
    limit,
    search,
    role,
    status,
    sortBy,
    sortOrder,
  } = query;

  const filter: Record<string, unknown> = {};

  if (role) {
    filter.role = role;
  }

  if (status) {
    filter.status = status;
  }

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");

    filter.$or = [
      { fullName: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      { employeeId: searchRegex },
    ];
  }

  const safeSortBy = allowedSortFields.includes(
    sortBy as (typeof allowedSortFields)[number],
  )
    ? sortBy
    : "createdAt";

  const sortDirection: 1 | -1 =
    sortOrder === "asc" ? 1 : -1;

  const sort: Record<string, 1 | -1> = {
    [safeSortBy]: sortDirection,
  };

  const skip = (page - 1) * limit;

  const [users, totalUsers] = await Promise.all([
    User.find(filter)
      .select(
        [
          "fullName",
          "email",
          "role",
          "status",
          "phone",
          "employeeId",
          "timezone",
          "joiningDate",
          "lastLoginAt",
          "createdAt",
          "updatedAt",
        ].join(" "),
      )
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    User.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalUsers / limit);

  return {
    users,
    pagination: {
      currentPage: page,
      limit,
      totalUsers,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Retrieve one user by MongoDB ObjectId.
 */
export async function getUserById(userId: string) {
  if (!mongoose.isValidObjectId(userId)) {
    throw new UserServiceError("Invalid user ID.", 400);
  }

  const user = await User.findById(userId)
    .select(
      [
        "fullName",
        "email",
        "role",
        "status",
        "phone",
        "employeeId",
        "timezone",
        "joiningDate",
        "invitationAcceptedAt",
        "lastLoginAt",
        "passwordChangedAt",
        "createdAt",
        "updatedAt",
      ].join(" "),
    )
    .lean();

  if (!user) {
    throw new UserServiceError("User not found.", 404);
  }

  return user;
}

/**
 * Create a user and a pending invitation.
 *
 * The user and invitation are created in one transaction.
 * Only the invitation token hash is stored in MongoDB.
 *
 * The raw token is returned only in development mode.
 */
export async function createUser(
  input: {
    fullName: string;
    email: string;
    phone?: string;
    employeeId?: string;
    role: UserRole;
    timezone?: string;
    joiningDate?: string | Date;
  },
  invitedById: string,
) {
  if (!mongoose.isValidObjectId(invitedById)) {
    throw new UserServiceError(
      "A valid inviting administrator ID is required.",
      400,
    );
  }

  const email = input.email.trim().toLowerCase();

  const invitationToken = randomBytes(32).toString("hex");

  const tokenHash = createHash("sha256")
    .update(invitationToken)
    .digest("hex");

  const expiresAt = new Date(
    Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  const session = await mongoose.startSession();

  let createdUser:
    | {
        _id: mongoose.Types.ObjectId;
        fullName: string;
        email: string;
        role: UserRole;
        status: UserStatus;
        phone?: string;
        employeeId?: string;
        timezone: string;
        joiningDate?: Date;
        createdAt: Date;
        updatedAt: Date;
      }
    | undefined;

  try {
    await session.withTransaction(async () => {
      const existingUser = await User.findOne({ email })
        .session(session)
        .lean();

      if (existingUser) {
        throw new UserServiceError(
          "Email address already exists.",
          409,
        );
      }

      // The invited user will set their real password later.
      const temporaryPassword = randomBytes(32).toString("hex");

      const user = new User({
        fullName: input.fullName.trim(),
        email,
        password: temporaryPassword,
        phone: input.phone,
        employeeId: input.employeeId,
        role: input.role,
        status: UserStatus.INVITED,
        timezone: input.timezone ?? "Asia/Kolkata",
        joiningDate: input.joiningDate
          ? new Date(input.joiningDate)
          : undefined,
      });

      await user.save({ session });

      const invitation = new Invitation({
        email,
        role:
          input.role === UserRole.ADMIN
            ? "admin"
            : "user",
        tokenHash,
        status: InvitationStatus.PENDING,
        invitedBy: new mongoose.Types.ObjectId(invitedById),
        expiresAt,
      });

      await invitation.save({ session });

      createdUser = {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        phone: user.phone,
        employeeId: user.employeeId,
        timezone: user.timezone,
        joiningDate: user.joiningDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });
  } catch (error: unknown) {
    if (error instanceof UserServiceError) {
      throw error;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new UserServiceError(
        "Email address or employee ID already exists.",
        409,
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }

  if (!createdUser) {
    throw new UserServiceError(
      "User and invitation could not be created.",
      500,
    );
  }

  return {
    user: createdUser,
    invitation: {
      expiresAt,
      ...(process.env.NODE_ENV === "development"
        ? { token: invitationToken }
        : {}),
    },
  };
}

/**
 * Update permitted user profile fields.
 *
 * Email, role, and status are handled separately.
 */
export async function updateUser(
  userId: string,
  input: UpdateUserInput,
) {
  if (!mongoose.isValidObjectId(userId)) {
    throw new UserServiceError("Invalid user ID.", 400);
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new UserServiceError("User not found.", 404);
  }

  if (input.fullName !== undefined) {
    user.fullName = input.fullName.trim();
  }

  if (input.phone !== undefined) {
    user.phone = input.phone;
  }

  if (input.employeeId !== undefined) {
    user.employeeId = input.employeeId;
  }

  if (input.timezone !== undefined) {
    user.timezone = input.timezone;
  }

  if (input.joiningDate !== undefined) {
    user.joiningDate = input.joiningDate
      ? new Date(input.joiningDate)
      : undefined;
  }

  try {
    await user.save();
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new UserServiceError(
        "Employee ID already exists.",
        409,
      );
    }

    throw error;
  }

  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.phone,
    employeeId: user.employeeId,
    timezone: user.timezone,
    joiningDate: user.joiningDate,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Change a user's role.
 *
 * Administrators cannot remove their own admin role.
 */
export async function changeUserRole(
  userId: string,
  newRole: ChangeUserRoleInput["role"],
  currentAdminId: string,
) {
  if (!mongoose.isValidObjectId(userId)) {
    throw new UserServiceError("Invalid user ID.", 400);
  }

  const roleToAssign =
    newRole === "admin"
      ? UserRole.ADMIN
      : UserRole.USER;

  const user = await User.findById(userId);

  if (!user) {
    throw new UserServiceError("User not found.", 404);
  }

  const isChangingOwnRole =
    user._id.toString() === currentAdminId;

  if (
    isChangingOwnRole &&
    roleToAssign !== UserRole.ADMIN
  ) {
    throw new UserServiceError(
      "You cannot remove your own admin role.",
      403,
    );
  }

  user.role = roleToAssign;

  await user.save();

  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.phone,
    employeeId: user.employeeId,
    timezone: user.timezone,
    joiningDate: user.joiningDate,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Change a user's account status.
 *
 * Supported statuses:
 * - active
 * - suspended
 * - deactivated
 *
 * Administrators cannot change their own account status.
 */
export async function changeUserStatus(
  userId: string,
  newStatus: ChangeUserStatusInput["status"],
  currentAdminId: string,
) {
  if (!mongoose.isValidObjectId(userId)) {
    throw new UserServiceError("Invalid user ID.", 400);
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new UserServiceError("User not found.", 404);
  }

  if (user._id.toString() === currentAdminId) {
    throw new UserServiceError(
      "You cannot change your own account status.",
      403,
    );
  }

  const statusToAssign =
    newStatus === "active"
      ? UserStatus.ACTIVE
      : newStatus === "suspended"
        ? UserStatus.SUSPENDED
        : UserStatus.DEACTIVATED;

  if (user.status === statusToAssign) {
    throw new UserServiceError(
      `User account is already ${newStatus}.`,
      400,
    );
  }

  user.status = statusToAssign;

  await user.save();

  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.phone,
    employeeId: user.employeeId,
    timezone: user.timezone,
    joiningDate: user.joiningDate,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Resend an invitation to an invited user.
 *
 * Previous pending invitations are revoked before the new
 * invitation is created.
 *
 * The raw token is returned only in development mode.
 */
export async function resendUserInvitation(
  userId: string,
  invitedById: string,
) {
  if (!mongoose.isValidObjectId(userId)) {
    throw new UserServiceError("Invalid user ID.", 400);
  }

  if (!mongoose.isValidObjectId(invitedById)) {
    throw new UserServiceError(
      "A valid inviting administrator ID is required.",
      400,
    );
  }

  const invitationToken = randomBytes(32).toString("hex");

  const tokenHash = createHash("sha256")
    .update(invitationToken)
    .digest("hex");

  const expiresAt = new Date(
    Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  const session = await mongoose.startSession();

  let result:
    | {
        userId: string;
        email: string;
        expiresAt: Date;
      }
    | undefined;

  try {
    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session);

      if (!user) {
        throw new UserServiceError("User not found.", 404);
      }

      if (user.status !== UserStatus.INVITED) {
        throw new UserServiceError(
          "An invitation can only be resent to a user awaiting acceptance.",
          409,
        );
      }

      const now = new Date();

      await Invitation.updateMany(
        {
          email: user.email,
          status: InvitationStatus.PENDING,
        },
        {
          $set: {
            status: InvitationStatus.REVOKED,
            revokedAt: now,
          },
        },
        { session },
      );

      const invitation = new Invitation({
        email: user.email,
        role:
          user.role === UserRole.ADMIN
            ? "admin"
            : "user",
        tokenHash,
        status: InvitationStatus.PENDING,
        invitedBy: new mongoose.Types.ObjectId(invitedById),
        expiresAt,
      });

      await invitation.save({ session });

      result = {
        userId: user.id,
        email: user.email,
        expiresAt,
      };
    });
  } catch (error: unknown) {
    if (error instanceof UserServiceError) {
      throw error;
    }

    throw error;
  } finally {
    await session.endSession();
  }

  if (!result) {
    throw new UserServiceError(
      "The invitation could not be resent.",
      500,
    );
  }

  return {
    ...result,
    ...(process.env.NODE_ENV === "development"
      ? { token: invitationToken }
      : {}),
  };
}

/**
 * Revoke a pending invitation.
 *
 * The user's account remains in the invited state, but the
 * revoked token can no longer be used to accept the invitation.
 */
export async function revokeUserInvitation(userId: string) {
  if (!mongoose.isValidObjectId(userId)) {
    throw new UserServiceError("Invalid user ID.", 400);
  }

  const session = await mongoose.startSession();

  let result:
    | {
        userId: string;
        email: string;
        status: InvitationStatus;
      }
    | undefined;

  try {
    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session);

      if (!user) {
        throw new UserServiceError("User not found.", 404);
      }

      if (user.status !== UserStatus.INVITED) {
        throw new UserServiceError(
          "Only invitations for users awaiting acceptance can be revoked.",
          409,
        );
      }

      const invitation = await Invitation.findOne({
        email: user.email,
        status: InvitationStatus.PENDING,
      })
        .sort({ createdAt: -1 })
        .session(session);

      if (!invitation) {
        throw new UserServiceError(
          "No pending invitation was found for this user.",
          404,
        );
      }

      invitation.status = InvitationStatus.REVOKED;
      invitation.revokedAt = new Date();

      await invitation.save({ session });

      result = {
        userId: user.id,
        email: user.email,
        status: invitation.status,
      };
    });
  } catch (error: unknown) {
    if (error instanceof UserServiceError) {
      throw error;
    }

    throw error;
  } finally {
    await session.endSession();
  }

  if (!result) {
    throw new UserServiceError(
      "The invitation could not be revoked.",
      500,
    );
  }

  return result;
}