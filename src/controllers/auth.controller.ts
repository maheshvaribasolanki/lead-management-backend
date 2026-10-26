
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

import {
  acceptInvitation,
  InvitationServiceError,
} from "../services/invitation.service";

import { acceptInvitationSchema } from "../validators/auth.validator";

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

    next(error);
  }
};

/**
 * POST /api/v1/auth/accept-invitation
 *
 * Accept an invitation and activate the user's account.
 */
export const acceptInvitationController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = acceptInvitationSchema.parse(req.body);

    const user = await acceptInvitation(input);

    res.status(200).json({
      success: true,
      message: "Invitation accepted successfully. You can now log in.",
      data: { user },
    });
  } catch (error: unknown) {
    if (error instanceof InvitationServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });

      return;
    }

    next(error);
  }
};
