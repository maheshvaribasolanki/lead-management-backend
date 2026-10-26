import { z } from "zod";

export const leadConfigurationTypeSchema = z.enum([
  "status",
  "source",
  "lost_reason",
  "tag",
]);

// Validate configuration name
export const leadConfigurationNameSchema = z
  .string()
  .trim()
  .min(2, "Configuration name must contain at least 2 characters.")
  .max(100, "Configuration name cannot exceed 100 characters.");

// Validate optional description
export const leadConfigurationDescriptionSchema = z
  .string()
  .trim()
  .max(500, "Description cannot exceed 500 characters.")
  .optional();

// Validate optional hexadecimal color
export const leadConfigurationColorSchema = z
  .string()
  .trim()
  .regex(
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
    "Color must be a valid hexadecimal color, such as #3498db.",
  )
  .optional();

// Validate sort order
export const leadConfigurationSortOrderSchema = z
  .number()
  .int("Sort order must be an integer.")
  .min(0, "Sort order cannot be negative.")
  .optional();

// Create configuration
export const createLeadConfigurationSchema = z.object({
  name: leadConfigurationNameSchema,
  type: leadConfigurationTypeSchema,
  description: leadConfigurationDescriptionSchema,
  color: leadConfigurationColorSchema,
  sortOrder: leadConfigurationSortOrderSchema,
});

// Update configuration
export const updateLeadConfigurationSchema = z
  .object({
    name: leadConfigurationNameSchema.optional(),
    description: leadConfigurationDescriptionSchema,
    color: leadConfigurationColorSchema,
    isActive: z.boolean().optional(),
    sortOrder: leadConfigurationSortOrderSchema,
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided.",
  );

// List and filter configurations
export const listLeadConfigurationsQuerySchema = z.object({
  type: leadConfigurationTypeSchema.optional(),

  search: z
    .string()
    .trim()
    .max(100, "Search cannot exceed 100 characters.")
    .optional(),

  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

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

  sortBy: z
    .enum(["name", "type", "sortOrder", "createdAt"])
    .default("sortOrder"),

  sortOrder: z
    .enum(["asc", "desc"])
    .default("asc"),
});

// Validate MongoDB ObjectId
export const leadConfigurationIdSchema = z.object({
  id: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid configuration ID."),
});

// Export inferred TypeScript types
export type CreateLeadConfigurationInput = z.infer<
  typeof createLeadConfigurationSchema
>;

export type UpdateLeadConfigurationInput = z.infer<
  typeof updateLeadConfigurationSchema
>;

export type ListLeadConfigurationsQuery = z.infer<
  typeof listLeadConfigurationsQuerySchema
>;