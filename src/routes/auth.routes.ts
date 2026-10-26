import { Router } from "express";

import { loginController } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate.middleware";
import { loginSchema } from "../validators/auth.validator";

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

export default router;