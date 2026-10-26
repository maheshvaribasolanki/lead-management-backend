import { z } from "zod";
import mongoose from "mongoose";

import { paginationSchema } from "./common.validator";

// Validate MongoDB ObjectId values.
const objectIdSchema = z
  .string()
  .refine(
    (value) => mongoose.isValidObjectId(value),
    "Invalid MongoDB ID.",
  );

// Validate lead name.
const leadNameSchema = z
  .string()
  .trim()
  .min(2, "Lead name must contain at least 2 characters.")
  .max(150, "Lead name cannot exceed 150 characters.");

// Validate optional email.
const leadEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254, "Email cannot exceed 254 characters.")
  .transform((value) => value.toLowerCase())
  .optional();

// Validate optional phone.
const leadPhoneSchema = z
  .string()
  .trim()
  .min(1, "Phone cannot be empty.")
  .max(30, "Phone cannot exceed 30 characters.")
  .optional();

// Create Lead request validation.
export const createLeadSchema = z.object({
  name: leadNameSchema,

  company: z
    .string()
    .trim()
    .max(200, "Company name cannot exceed 200 characters.")
    .optional(),

  email: leadEmailSchema,

  phone: leadPhoneSchema,

  ownerId: objectIdSchema.nullable().optional(),

  statusId: objectIdSchema,

  sourceId: objectIdSchema.nullable().optional(),

  tags: z.array(objectIdSchema).optional(),

  lostReasonId: objectIdSchema.nullable().optional(),
});

// Update Lead request validation.
export const updateLeadSchema = z
  .object({
    name: leadNameSchema.optional(),

    company: z
      .string()
      .trim()
      .max(200, "Company name cannot exceed 200 characters.")
      .optional(),

    email: leadEmailSchema,

    phone: leadPhoneSchema,

    ownerId: objectIdSchema.nullable().optional(),

    statusId: objectIdSchema.optional(),

    sourceId: objectIdSchema.nullable().optional(),

    tags: z.array(objectIdSchema).optional(),

    lostReasonId: objectIdSchema.nullable().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update.",
  );

// Validate Lead ID in route parameters.
export const leadIdSchema = z.object({
  id: objectIdSchema,
});

// Validate Lead list query parameters.
export const listLeadsQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),

  statusId: objectIdSchema.optional(),

  sourceId: objectIdSchema.optional(),

  ownerId: objectIdSchema.optional(),

  archived: z
    .enum(["true", "false"])
    .optional(),
});

// Export inferred TypeScript types.
export type CreateLeadInput = z.infer<
  typeof createLeadSchema
>;

export type UpdateLeadInput = z.infer<
  typeof updateLeadSchema
>;

export type ListLeadsQuery = z.infer<
  typeof listLeadsQuerySchema
>;