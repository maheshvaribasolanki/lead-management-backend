
import { Router } from "express";

import {
  authenticate,
  requireAdmin,
} from "../middleware/auth.middleware";

import {
  validateQuery,
  validateParams,
  validateBody,
} from "../middleware/validate.middleware";

import {
  listUsersController,
  getUserByIdController,
  createUserController,
  updateUserController,
  changeUserRoleController,
  changeUserStatusController,
} from "../controllers/user.controller";

import {
  listUsersQuerySchema,
  createUserSchema,
  updateUserSchema,
  changeUserRoleSchema,
  changeUserStatusSchema,
} from "../validators/user.validator";

import { objectIdSchema } from "../validators/common.validator";

const router = Router();

// Protect all admin routes.
router.use(authenticate);
router.use(requireAdmin);

// GET /api/v1/admin/users
// Retrieve users with filtering and pagination.
router.get(
  "/users",
  validateQuery(listUsersQuerySchema),
  listUsersController,
);

// GET /api/v1/admin/users/:id
// Retrieve a single user.
router.get(
  "/users/:id",
  validateParams(objectIdSchema),
  getUserByIdController,
);

// POST /api/v1/admin/users
// Create a new user.
router.post(
  "/users",
  validateBody(createUserSchema),
  createUserController,
);

// PATCH /api/v1/admin/users/:id
// Update permitted user profile fields.
router.patch(
  "/users/:id",
  validateParams(objectIdSchema),
  validateBody(updateUserSchema),
  updateUserController,
);

// PATCH /api/v1/admin/users/:id/role
// Change a user's role.
router.patch(
  "/users/:id/role",
  validateParams(objectIdSchema),
  validateBody(changeUserRoleSchema),
  changeUserRoleController,
);

// PATCH /api/v1/admin/users/:id/status
// Change a user's account status.
router.patch(
  "/users/:id/status",
  validateParams(objectIdSchema),
  validateBody(changeUserStatusSchema),
  changeUserStatusController,
);

export default router;
