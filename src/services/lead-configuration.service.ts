
import mongoose from "mongoose";

import LeadConfiguration, {
  LeadConfigurationType,
  type LeadConfigurationDocument,
} from "../models/LeadConfiguration";

import type {
  CreateLeadConfigurationInput,
  UpdateLeadConfigurationInput,
  ListLeadConfigurationsQuery,
} from "../validators/lead-configuration.validator";

export class LeadConfigurationServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "LeadConfigurationServiceError";
    this.statusCode = statusCode;
  }
}

/**
 * Convert a string into the LeadConfigurationType enum.
 * This resolves the mismatch between Zod's inferred string union
 * and the enum expected by the Mongoose model.
 */
function toLeadConfigurationType(value: string): LeadConfigurationType {
  switch (value) {
    case "status":
      return LeadConfigurationType.STATUS;

    case "source":
      return LeadConfigurationType.SOURCE;

    case "lost_reason":
      return LeadConfigurationType.LOST_REASON;

    case "tag":
      return LeadConfigurationType.TAG;

    default:
      throw new LeadConfigurationServiceError(
        "Invalid lead configuration type.",
        400,
      );
  }
}

/**
 * Validate a MongoDB document ID.
 */
function validateConfigurationId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new LeadConfigurationServiceError(
      "Invalid lead configuration ID.",
      400,
    );
  }
}

/**
 * Escape special regular-expression characters.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Handle duplicate-key errors.
 */
function handleDuplicateError(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    throw new LeadConfigurationServiceError(
      "A configuration with this name already exists for this type.",
      409,
    );
  }

  throw error;
}

/**
 * Create a new lead configuration.
 */
export async function createLeadConfiguration(
  input: CreateLeadConfigurationInput,
): Promise<LeadConfigurationDocument> {
  try {
    const configurationType = toLeadConfigurationType(input.type);

    const existingConfiguration = await LeadConfiguration.findOne()
      .where("type")
      .equals(configurationType)
      .where("name")
      .regex(new RegExp(`^${escapeRegex(input.name)}$`, "i"));

    if (existingConfiguration) {
      throw new LeadConfigurationServiceError(
        "A configuration with this name already exists for this type.",
        409,
      );
    }

    const configuration = await LeadConfiguration.create({
      name: input.name,
      type: configurationType,
      description: input.description,
      color: input.color,
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
    });

    return configuration;
  } catch (error: unknown) {
    if (error instanceof LeadConfigurationServiceError) {
      throw error;
    }

    handleDuplicateError(error);
  }
}

/**
 * Retrieve a paginated list of lead configurations.
 */
export async function listLeadConfigurations(
  query: ListLeadConfigurationsQuery,
) {
  const {
    type,
    isActive,
    search,
    page = 1,
    limit = 10,
  } = query;

  const filter: {
    type?: LeadConfigurationType;
    isActive?: boolean;
    name?: RegExp;
  } = {};

  if (type) {
    filter.type = toLeadConfigurationType(type);
  }

  if (typeof isActive === "boolean") {
    filter.isActive = isActive;
  }

  if (search?.trim()) {
    filter.name = new RegExp(escapeRegex(search.trim()), "i");
  }

  const skip = (page - 1) * limit;

  const [configurations, total] = await Promise.all([
    LeadConfiguration.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    LeadConfiguration.countDocuments(filter),
  ]);

  return {
    configurations,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Retrieve one lead configuration by ID.
 */
export async function getLeadConfigurationById(
  id: string,
): Promise<LeadConfigurationDocument> {
  validateConfigurationId(id);

  const configuration = await LeadConfiguration.findById(id);

  if (!configuration) {
    throw new LeadConfigurationServiceError(
      "Lead configuration not found.",
      404,
    );
  }

  return configuration;
}

/**
 * Update an existing lead configuration.
 */
export async function updateLeadConfiguration(
  id: string,
  input: UpdateLeadConfigurationInput,
): Promise<LeadConfigurationDocument> {
  validateConfigurationId(id);

  try {
    const configuration = await LeadConfiguration.findById(id);

    if (!configuration) {
      throw new LeadConfigurationServiceError(
        "Lead configuration not found.",
        404,
      );
    }

    if (input.name !== undefined) {
      const duplicate = await LeadConfiguration.findOne()
        .where("type")
        .equals(configuration.type)
        .where("name")
        .regex(new RegExp(`^${escapeRegex(input.name)}$`, "i"))
        .where("_id")
        .ne(configuration._id);

      if (duplicate) {
        throw new LeadConfigurationServiceError(
          "A configuration with this name already exists for this type.",
          409,
        );
      }

      configuration.name = input.name;
    }

    if (input.description !== undefined) {
      configuration.description = input.description;
    }

    if (input.color !== undefined) {
      configuration.color = input.color;
    }

    if (input.sortOrder !== undefined) {
      configuration.sortOrder = input.sortOrder;
    }

    await configuration.save();

    return configuration;
  } catch (error: unknown) {
    if (error instanceof LeadConfigurationServiceError) {
      throw error;
    }

    handleDuplicateError(error);
  }
}

/**
 * Deactivate a lead configuration without deleting it.
 */
export async function deactivateLeadConfiguration(
  id: string,
): Promise<LeadConfigurationDocument> {
  validateConfigurationId(id);

  const configuration = await LeadConfiguration.findById(id);

  if (!configuration) {
    throw new LeadConfigurationServiceError(
      "Lead configuration not found.",
      404,
    );
  }

  if (!configuration.isActive) {
    throw new LeadConfigurationServiceError(
      "Lead configuration is already inactive.",
      400,
    );
  }

  configuration.isActive = false;

  await configuration.save();

  return configuration;
}
