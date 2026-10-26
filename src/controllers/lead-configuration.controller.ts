
import type { Request, Response } from "express";

import {
  createLeadConfiguration,
  listLeadConfigurations,
  getLeadConfigurationById,
  updateLeadConfiguration,
  deactivateLeadConfiguration,
  LeadConfigurationServiceError,
} from "../services/lead-configuration.service";

import type {
  CreateLeadConfigurationInput,
  UpdateLeadConfigurationInput,
  ListLeadConfigurationsQuery,
} from "../validators/lead-configuration.validator";

/**
 * Handle controller errors consistently.
 */
function handleControllerError(
  error: unknown,
  res: Response,
): Response {
  if (error instanceof LeadConfigurationServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    return res.status(409).json({
      success: false,
      message:
        "A configuration with this name already exists for this type.",
    });
  }

  console.error("Lead configuration controller error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred.",
  });
}

/**
 * POST: Create a lead configuration.
 */
export async function createLeadConfigurationController(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const input = req.body as CreateLeadConfigurationInput;

    const configuration = await createLeadConfiguration(input);

    return res.status(201).json({
      success: true,
      message: "Lead configuration created successfully.",
      data: {
        configuration,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(error, res);
  }
}

/**
 * GET: List lead configurations with pagination and filters.
 */
export async function listLeadConfigurationsController(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const query =
      req.query as unknown as ListLeadConfigurationsQuery;

    const result = await listLeadConfigurations(query);

    return res.status(200).json({
      success: true,
      message: "Lead configurations retrieved successfully.",
      data: result,
    });
  } catch (error: unknown) {
    return handleControllerError(error, res);
  }
}

/**
 * GET: Retrieve a lead configuration by ID.
 */
export async function getLeadConfigurationByIdController(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = String(req.params.id ?? "");

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Lead configuration ID is required.",
      });
    }

    const configuration = await getLeadConfigurationById(id);

    return res.status(200).json({
      success: true,
      message: "Lead configuration retrieved successfully.",
      data: {
        configuration,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(error, res);
  }
}

/**
 * PATCH: Update a lead configuration.
 */
export async function updateLeadConfigurationController(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = String(req.params.id ?? "");

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Lead configuration ID is required.",
      });
    }

    const input = req.body as UpdateLeadConfigurationInput;

    const configuration = await updateLeadConfiguration(id, input);

    return res.status(200).json({
      success: true,
      message: "Lead configuration updated successfully.",
      data: {
        configuration,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(error, res);
  }
}

/**
 * PATCH: Deactivate a lead configuration.
 * The record remains in the database.
 */
export async function deactivateLeadConfigurationController(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = String(req.params.id ?? "");

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Lead configuration ID is required.",
      });
    }

    const configuration = await deactivateLeadConfiguration(id);

    return res.status(200).json({
      success: true,
      message: "Lead configuration deactivated successfully.",
      data: {
        configuration,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(error, res);
  }
}
