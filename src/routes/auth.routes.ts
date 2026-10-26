
import { Router } from "express";

import {
  loginController,
  acceptInvitationController,
} from "../controllers/auth.controller";

import { validateBody } from "../middleware/validate.middleware";

import {
  loginSchema,
  acceptInvitationSchema,
} from "../validators/auth.validator";

const router = Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate a user and return an access token
 * @access  Public
 */
router.post(
  "/login",
  validateBody(loginSchema),
  loginController,
);

/**
 * @route   POST /api/v1/auth/accept-invitation
 * @desc    Accept an invitation and activate the user's account
 * @access  Public
 */
router.post(
  "/accept-invitation",
  validateBody(acceptInvitationSchema),
  acceptInvitationController,
);

export default router;
