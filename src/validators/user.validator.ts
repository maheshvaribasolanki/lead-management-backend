
import { z } from "zod";
import { UserStatus } from "../models/User";

import {
  emailSchema,
  employeeIdSchema,
  fullNameSchema,
  paginationSchema,
  phoneSchema,
  timezoneSchema,
} from "./common.validator";

// User roles supported by the backend.
export const userRoleSchema = z.enum([
  "admin",
  "user",
]);

// Account statuses supported by the User Model.
export const userStatusSchema = z.enum([
  "invited",
  "active",
  "suspended",
  "deactivated",
  "pending_deletion",
  "deleted",
]);

// Validate an administrator's request to create or invite a user.
export const createUserSchema = z.object({
  fullName: fullNameSchema,

  email: emailSchema,

  role: userRoleSchema.default("user"),

  phone: phoneSchema,

  employeeId: employeeIdSchema,

  timezone: timezoneSchema.default("Asia/Kolkata"),

  joiningDate: z
    .string()
    .date("Joining date must use YYYY-MM-DD format.")
    .optional(),
});

// Validate permitted user profile updates.
// Role and account status are deliberately excluded.
// They have dedicated administrative operations.
export const updateUserSchema = z
  .object({
    fullName: fullNameSchema.optional(),

    phone: phoneSchema,

    employeeId: employeeIdSchema,

    timezone: timezoneSchema.optional(),

    joiningDate: z
      .string()
      .date("Joining date must use YYYY-MM-DD format.")
      .nullable()
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided.",
  );

// Validate a request to change a user's role.
export const changeUserRoleSchema = z.object({
  role: userRoleSchema,
});

// Validate administrative account status changes.
export const changeUserStatusSchema = z.object({
  status: z.enum([
    "active",
    "suspended",
    "deactivated",
  ]),
});

// Validate user-list query parameters.
export const listUsersQuerySchema = paginationSchema.extend({
  search: z
    .string()
    .trim()
    .max(100, "Search cannot exceed 100 characters.")
    .optional(),

  role: userRoleSchema.optional(),

  status: userStatusSchema.optional(),

  sortBy: z
    .enum([
      "fullName",
      "email",
      "role",
      "status",
      "createdAt",
      "lastLoginAt",
    ])
    .default("createdAt"),

  sortOrder: z
    .enum(["asc", "desc"])
    .default("desc"),
});

// Validate a request to resend an invitation.
export const resendInvitationSchema = z.object({
  userId: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid user ID."),
});

// Validate a request to force a user's sessions to end.
export const forceLogoutSchema = z.object({
  userId: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid user ID."),
});


// Export TypeScript types.
export type CreateUserInput = z.infer<
  typeof createUserSchema
>;

export type UpdateUserInput = z.infer<
  typeof updateUserSchema
>;

export type ChangeUserRoleInput = z.infer<
  typeof changeUserRoleSchema
>;

export type ChangeUserStatusInput = z.infer<
  typeof changeUserStatusSchema
>;

export type ListUsersQuery = z.infer<
  typeof listUsersQuerySchema
>;
