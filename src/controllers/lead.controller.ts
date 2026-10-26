
import type { Request, Response, NextFunction } from "express";

import {
  createLead,
  listLeads,
  getLeadById,
  updateLead,
  LeadServiceError,
} from "../services/lead.service";

// Create a new lead.
export async function createLeadController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const actor = {
      userId: req.user._id.toString(),
      role: req.user.role,
    };

    const lead = await createLead(req.body, actor);

    res.status(201).json({
      success: true,
      message: "Lead created successfully.",
      data: { lead },
    });
  } catch (error: unknown) {
    handleLeadError(error, next);
  }
}

// Retrieve leads with pagination and filters.
export async function listLeadsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const actor = {
      userId: req.user._id.toString(),
      role: req.user.role,
    };

    const result = await listLeads(
      req.query as never,
      actor,
    );

    res.status(200).json({
      success: true,
      message: "Leads retrieved successfully.",
      data: result,
    });
  } catch (error: unknown) {
    handleLeadError(error, next);
  }
}

// Retrieve one lead by ID.
export async function getLeadByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const actor = {
      userId: req.user._id.toString(),
      role: req.user.role,
    };

    const lead = await getLeadById(
      String(req.params.id),
      actor,
    );

    res.status(200).json({
      success: true,
      message: "Lead retrieved successfully.",
      data: { lead },
    });
  } catch (error: unknown) {
    handleLeadError(error, next);
  }
}

// Update an existing lead.
export async function updateLeadController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const actor = {
      userId: req.user._id.toString(),
      role: req.user.role,
    };

    const lead = await updateLead(
      String(req.params.id),
      req.body,
      actor,
    );

    res.status(200).json({
      success: true,
      message: "Lead updated successfully.",
      data: { lead },
    });
  } catch (error: unknown) {
    handleLeadError(error, next);
  }
}

// Forward service errors to the Express error handler.
function handleLeadError(
  error: unknown,
  next: NextFunction,
): void {
  if (error instanceof LeadServiceError) {
    next(error);
    return;
  }

  next(error);
}
