import { z } from "zod";
import {
  emailSchema,
  passwordSchema,
} from "./common.validator";

// Login request validation.
export const loginSchema = z.object({
  email: emailSchema,

  // Do not apply the new-password complexity rules to login.
  // Existing users may have passwords created under older policies.
  password: z
    .string()
    .min(1, "Password is required.")
    .max(1024, "Password is too long."),
});

// Accept an invitation and create the user's password.
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

// Request a password reset email.
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Submit a password reset token and a new password.
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

// Change a password while logged in.
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

// Export inferred TypeScript types.
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