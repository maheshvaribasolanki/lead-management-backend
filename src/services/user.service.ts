
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import type { z } from "zod";

import User, { UserRole, UserStatus } from "../models/User";

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

/**
 * Escape special regular-expression characters in search input.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Service error with an associated HTTP status code.
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
 * Create a new user.
 *
 * New accounts start with invited status.
 * The User model hashes the password before saving.
 */
export async function createUser(input: {
  fullName: string;
  email: string;
  phone?: string;
  employeeId?: string;
  role: UserRole;
  timezone?: string;
  joiningDate?: string | Date;
}) {
  const email = input.email.trim().toLowerCase();

  const existingUser = await User.findOne({ email }).lean();

  if (existingUser) {
    throw new UserServiceError(
      "Email address already exists.",
      409,
    );
  }

  const temporaryPassword = randomBytes(32).toString("hex");

  try {
    const user = await User.create({
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
  } catch (error: unknown) {
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
  }
}

/**
 * Update permitted user profile fields.
 *
 * Email, role, and status are intentionally excluded.
 * Those fields have separate administrative operations.
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

  // A null joiningDate clears the existing date.
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

  // Convert the validated string union to the model enum.
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

  // Prevent administrators from disabling their own accounts.
  if (user._id.toString() === currentAdminId) {
    throw new UserServiceError(
      "You cannot change your own account status.",
      403,
    );
  }

  // Convert the validated status to the model enum.
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
