
import { z } from "zod";

import {
  emailSchema,
  passwordSchema,
} from "./common.validator";

/**
 * Validate a login request.
 *
 * Existing passwords may follow older policies, so login
 * does not apply the new-password complexity requirements.
 */
export const loginSchema = z.object({
  email: emailSchema,

  password: z
    .string()
    .min(1, "Password is required.")
    .max(1024, "Password is too long."),
});

/**
 * Validate an invitation acceptance request.
 */
export const acceptInvitationSchema = z
  .object({
    token: z
      .string()
      .min(1, "Invitation token is required."),

    password: passwordSchema,

    confirmPassword: z
      .string()
      .min(1, "Please confirm your password."),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    },
  );

/**
 * Validate a forgot-password request.
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Validate a password-reset request.
 */
export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .min(1, "Password reset token is required."),

    password: passwordSchema,

    confirmPassword: z
      .string()
      .min(1, "Please confirm your password."),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    },
  );

/**
 * Validate a logged-in user's password-change request.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required.")
      .max(1024, "Current password is too long."),

    newPassword: passwordSchema,

    confirmPassword: z
      .string()
      .min(1, "Please confirm your password."),
  })
  .refine(
    (data) => data.newPassword === data.confirmPassword,
    {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    },
  )
  .refine(
    (data) => data.currentPassword !== data.newPassword,
    {
      message: "New password must differ from the current password.",
      path: ["newPassword"],
    },
  );

/**
 * Export inferred TypeScript types.
 */
export type LoginInput = z.infer<typeof loginSchema>;

export type AcceptInvitationInput = z.infer<
  typeof acceptInvitationSchema
>;

export type ForgotPasswordInput = z.infer<
  typeof forgotPasswordSchema
>;

export type ResetPasswordInput = z.infer<
  typeof resetPasswordSchema
>;

export type ChangePasswordInput = z.infer<
  typeof changePasswordSchema
>;
