import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";

import {
  loginUser,
  AuthServiceError,
  type LoginInput,
} from "../services/auth.service";

/**
 * POST /api/v1/auth/login
 *
 * Authenticate a user and return an access token.
 */
export const loginController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = req.body as LoginInput;

    const result = await loginUser(input);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: result,
    });
  } catch (error: unknown) {
    if (error instanceof AuthServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });

      return;
    }

    // Pass unexpected errors to Express error handling.
    next(error);
  }
};