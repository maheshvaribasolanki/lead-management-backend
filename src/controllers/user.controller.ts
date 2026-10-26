
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
  UserServiceError,
} from "../services/user.service";

import {
  listUsersQuerySchema,
  updateUserSchema,
  changeUserRoleSchema,
  changeUserStatusSchema,
} from "../validators/user.validator";

import type {
  ChangeUserRoleInput,
  ChangeUserStatusInput,
} from "../validators/user.validator";

// GET /api/v1/admin/users
// Retrieve users with filtering and pagination.
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
  } catch (error: unknown) {
    next(error);
  }
};

// GET /api/v1/admin/users/:id
// Retrieve a single user by ID.
export const getUserByIdController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (typeof userId !== "string") {
      res.status(400).json({
        success: false,
        message: "A valid user ID is required.",
      });

      return;
    }

    const user = await getUserById(userId);

    res.status(200).json({
      success: true,
      message: "User retrieved successfully.",
      data: { user },
    });
  } catch (error: unknown) {
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

// POST /api/v1/admin/users
// Create a new user.
export const createUserController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await createUser(req.body);

    res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: { user },
    });
  } catch (error: unknown) {
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

// PATCH /api/v1/admin/users/:id
// Update permitted user profile fields.
export const updateUserController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (typeof userId !== "string") {
      res.status(400).json({
        success: false,
        message: "A valid user ID is required.",
      });

      return;
    }

    const input = updateUserSchema.parse(req.body);
    const user = await updateUser(userId, input);

    res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: { user },
    });
  } catch (error: unknown) {
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

// PATCH /api/v1/admin/users/:id/role
// Change a user's role.
export const changeUserRoleController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (typeof userId !== "string") {
      res.status(400).json({
        success: false,
        message: "A valid user ID is required.",
      });

      return;
    }

    // Validate the request body.
    const input: ChangeUserRoleInput =
      changeUserRoleSchema.parse(req.body);

    // Get the authenticated administrator's MongoDB ID.
    const currentAdminId = req.user?._id?.toString();

    if (!currentAdminId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });

      return;
    }

    // Change the target user's role.
    const user = await changeUserRole(
      userId,
      input.role,
      currentAdminId,
    );

    res.status(200).json({
      success: true,
      message: "User role updated successfully.",
      data: { user },
    });
  } catch (error: unknown) {
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

// PATCH /api/v1/admin/users/:id/status
// Change a user's account status.
export const changeUserStatusController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (typeof userId !== "string") {
      res.status(400).json({
        success: false,
        message: "A valid user ID is required.",
      });

      return;
    }

    // Validate the requested account status.
    const input: ChangeUserStatusInput =
      changeUserStatusSchema.parse(req.body);

    // Get the authenticated administrator's MongoDB ID.
    const currentAdminId = req.user?._id?.toString();

    if (!currentAdminId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });

      return;
    }

    // Update the target user's account status.
    const user = await changeUserStatus(
      userId,
      input.status,
      currentAdminId,
    );

    res.status(200).json({
      success: true,
      message: "User status updated successfully.",
      data: { user },
    });
  } catch (error: unknown) {
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