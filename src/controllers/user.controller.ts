import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";

import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserRole,
  changeUserStatus,
  resendUserInvitation,
  revokeUserInvitation,
  UserServiceError,
} from "../services/user.service";

import {
  listUsersQuerySchema,
  createUserSchema,
  updateUserSchema,
  changeUserRoleSchema,
  changeUserStatusSchema,
} from "../validators/user.validator";

import { objectIdSchema } from "../validators/common.validator";
import { UserRole } from "../models/User";

/**
 * GET /api/v1/admin/users
 * List users with pagination, filtering, and search.
 */
export const listUsersController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await listUsers(query);

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/users/:id
 * Retrieve a single user.
 */
export const getUserByIdController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = objectIdSchema.parse(req.params);
    const user = await getUserById(id);

    res.status(200).json({
      success: true,
      message: "User retrieved successfully.",
      data: { user },
    });
  } catch (error) {
    if (error instanceof UserServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    next(error);
  }
};

/**
 * POST /api/v1/admin/users
 * Create a user and generate an invitation.
 */
export const createUserController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const currentAdminId = req.user?._id?.toString();

    if (!currentAdminId) {
      res.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    const input = createUserSchema.parse(req.body);

    const result = await createUser(
      {
        ...input,
        role:
          input.role === "admin"
            ? UserRole.ADMIN
            : UserRole.USER,
      },
      currentAdminId,
    );

    res.status(201).json({
      success: true,
      message: "User created and invitation generated successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof UserServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    next(error);
  }
};

/**
 * PATCH /api/v1/admin/users/:id
 * Update user profile details.
 */
export const updateUserController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = objectIdSchema.parse(req.params);
    const input = updateUserSchema.parse(req.body);

    const user = await updateUser(id, input);

    res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: { user },
    });
  } catch (error) {
    if (error instanceof UserServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    next(error);
  }
};

/**
 * PATCH /api/v1/admin/users/:id/role
 * Change a user's role.
 */
export const changeUserRoleController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const currentAdminId = req.user?._id?.toString();

    if (!currentAdminId) {
      res.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    const { id } = objectIdSchema.parse(req.params);
    const input = changeUserRoleSchema.parse(req.body);

    const role =
      input.role === "admin"
        ? UserRole.ADMIN
        : UserRole.USER;

    const user = await changeUserRole(
      id,
      role,
      currentAdminId,
    );

    res.status(200).json({
      success: true,
      message: "User role updated successfully.",
      data: { user },
    });
  } catch (error) {
    if (error instanceof UserServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    next(error);
  }
};

/**
 * PATCH /api/v1/admin/users/:id/status
 * Change a user's account status.
 */
export const changeUserStatusController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const currentAdminId = req.user?._id?.toString();

    if (!currentAdminId) {
      res.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    const { id } = objectIdSchema.parse(req.params);
    const input = changeUserStatusSchema.parse(req.body);

    const user = await changeUserStatus(
      id,
      input.status,
      currentAdminId,
    );

    res.status(200).json({
      success: true,
      message: "User status updated successfully.",
      data: { user },
    });
  } catch (error) {
    if (error instanceof UserServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    next(error);
  }
};

/**
 * POST /api/v1/admin/users/:id/resend-invitation
 * Generate a replacement invitation for an invited user.
 */
export const resendUserInvitationController: RequestHandler =
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const currentAdminId = req.user?._id?.toString();

      if (!currentAdminId) {
        res.status(401).json({
          success: false,
          message: "Authentication is required.",
        });
        return;
      }

      const { id } = objectIdSchema.parse(req.params);

      const invitation = await resendUserInvitation(
        id,
        currentAdminId,
      );

      res.status(200).json({
        success: true,
        message: "Invitation resent successfully.",
        data: { invitation },
      });
    } catch (error) {
      if (error instanceof UserServiceError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }

      next(error);
    }
  };

/**
 * POST /api/v1/admin/users/:id/revoke-invitation
 * Revoke a user's pending invitation.
 */
export const revokeUserInvitationController: RequestHandler =
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const currentAdminId = req.user?._id?.toString();

      if (!currentAdminId) {
        res.status(401).json({
          success: false,
          message: "Authentication is required.",
        });
        return;
      }

      const { id } = objectIdSchema.parse(req.params);

      const invitation = await revokeUserInvitation(id);

      res.status(200).json({
        success: true,
        message: "Invitation revoked successfully.",
        data: { invitation },
      });
    } catch (error) {
      if (error instanceof UserServiceError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }

      next(error);
    }
  };