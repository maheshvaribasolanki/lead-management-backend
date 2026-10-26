
import { Router } from "express";

import {
  authenticate,
  requireAdmin,
} from "../middleware/auth.middleware";

import {
  validateBody,
  validateQuery,
  validateParams,
} from "../middleware/validate.middleware";

import {
  createLeadConfigurationController,
  listLeadConfigurationsController,
  getLeadConfigurationByIdController,
  updateLeadConfigurationController,
  deactivateLeadConfigurationController,
} from "../controllers/lead-configuration.controller";

import {
  createLeadConfigurationSchema,
  updateLeadConfigurationSchema,
  listLeadConfigurationsQuerySchema,
  leadConfigurationIdSchema,
} from "../validators/lead-configuration.validator";

const router = Router();

// All lead configuration routes require an authenticated admin.
router.use(authenticate, requireAdmin);

// POST /api/v1/admin/lead-configurations
// Create a lead configuration.
router.post(
  "/",
  validateBody(createLeadConfigurationSchema),
  createLeadConfigurationController,
);

// GET /api/v1/admin/lead-configurations
// List configurations with pagination and filters.
router.get(
  "/",
  validateQuery(listLeadConfigurationsQuerySchema),
  listLeadConfigurationsController,
);

// GET /api/v1/admin/lead-configurations/:id
// Retrieve a configuration by ID.
router.get(
  "/:id",
  validateParams(leadConfigurationIdSchema),
  getLeadConfigurationByIdController,
);

// PATCH /api/v1/admin/lead-configurations/:id
// Update a configuration.
router.patch(
  "/:id",
  validateParams(leadConfigurationIdSchema),
  validateBody(updateLeadConfigurationSchema),
  updateLeadConfigurationController,
);

// PATCH /api/v1/admin/lead-configurations/:id/deactivate
// Deactivate a configuration without deleting it.
router.patch(
  "/:id/deactivate",
  validateParams(leadConfigurationIdSchema),
  deactivateLeadConfigurationController,
);

export default router;
