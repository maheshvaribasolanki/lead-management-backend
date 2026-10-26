import { z } from "zod";

// Validate email addresses and normalize their casing.
export const emailSchema = z
  .string()
  .trim()
  .email("Please provide a valid email address.")
  .max(254, "Email address cannot exceed 254 characters.")
  .transform((email) => email.toLowerCase());

// Validate full names.
export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Full name must contain at least 2 characters.")
  .max(100, "Full name cannot exceed 100 characters.");

// Validate passwords for our bcrypt-based password system.
export const passwordSchema = z
  .string()
  .min(10, "Password must contain at least 10 characters.")
  .max(72, "Password cannot exceed 72 characters.")
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "Password cannot exceed 72 bytes.",
  )
  .refine(
    (password) => /[a-z]/.test(password),
    "Password must contain a lowercase letter.",
  )
  .refine(
    (password) => /[A-Z]/.test(password),
    "Password must contain an uppercase letter.",
  )
  .refine(
    (password) => /\d/.test(password),
    "Password must contain a number.",
  )
  .refine(
    (password) => /[^A-Za-z0-9]/.test(password),
    "Password must contain a special character.",
  );

// Validate optional phone numbers.
export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Phone number is too short.")
  .max(25, "Phone number cannot exceed 25 characters.")
  .regex(
    /^[+0-9().\-\s]+$/,
    "Please provide a valid phone number.",
  )
  .optional();

// Validate employee IDs.
export const employeeIdSchema = z
  .string()
  .trim()
  .min(1, "Employee ID cannot be empty.")
  .max(50, "Employee ID cannot exceed 50 characters.")
  .transform((employeeId) => employeeId.toUpperCase())
  .optional();

// Validate IANA time zone names.
export const timezoneSchema = z
  .string()
  .trim()
  .min(1, "Time zone is required.")
  .refine(
    (timezone) => {
      try {
        Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
        });

        return true;
      } catch {
        return false;
      }
    },
    "Please provide a valid time zone.",
  );

// Validate pagination values supplied as query strings.
export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10),
});

// Validate MongoDB document IDs.
export const objectIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format."),
});

