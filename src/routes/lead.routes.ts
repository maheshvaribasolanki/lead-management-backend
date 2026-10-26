
import { Router } from "express";

import {
  authenticate,
} from "../middleware/auth.middleware";

import {
  validateBody,
  validateQuery,
  validateParams,
} from "../middleware/validate.middleware";

import {
  createLeadController,
  listLeadsController,
  getLeadByIdController,
  updateLeadController,
} from "../controllers/lead.controller";

import {
  createLeadSchema,
  updateLeadSchema,
  leadIdSchema,
  listLeadsQuerySchema,
} from "../validators/lead.validator";

const router = Router();

// All lead routes require authentication.
router.use(authenticate);

// Create a lead.
router.post(
  "/",
  validateBody(createLeadSchema),
  createLeadController,
);

// Get leads with filters and pagination.
router.get(
  "/",
  validateQuery(listLeadsQuerySchema),
  listLeadsController,
);

// Get one lead by ID.
router.get(
  "/:id",
  validateParams(leadIdSchema),
  getLeadByIdController,
);

// Update a lead.
router.patch(
  "/:id",
  validateParams(leadIdSchema),
  validateBody(updateLeadSchema),
  updateLeadController,
);

export default router;
