import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";

import jwt, { type JwtPayload } from "jsonwebtoken";

import User, {
  UserRole,
  UserStatus,
} from "../models/User";

import { env } from "../config/env";

/**
 * Authenticate the user using a JWT access token.
 *
 * Expected header:
 * Authorization: Bearer <access_token>
 */
export const authenticate: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authorization = req.headers.authorization;

  // Check whether the Authorization header exists.
  if (!authorization) {
    res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });

    return;
  }

  // Extract the Bearer token.
  const [scheme, token, ...extraParts] = authorization.trim().split(/\s+/);

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token ||
    extraParts.length > 0
  ) {
    res.status(401).json({
      success: false,
      message: "Invalid authorization header.",
    });

    return;
  }

  let decoded: string | JwtPayload;

  // Verify the JWT signature and expiration.
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired access token. Please log in again.",
    });

    return;
  }

  // Our access tokens must contain a subject identifying the user.
  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    !decoded.sub
  ) {
    res.status(401).json({
      success: false,
      message: "Invalid access token payload.",
    });

    return;
  }

  // Load the user from the database.
  // The database is the source of truth for the user's role and status.
  try {
    const user = await User.findById(decoded.sub);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User account not found. Please log in again.",
      });

      return;
    }

    // Only active users can access protected endpoints.
    if (user.status !== UserStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        message: "Your account is not active. Access is denied.",
      });

      return;
    }

    // Attach the authenticated user to the request.
    req.user = user;

    next();
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Allow only administrators to access an endpoint.
 *
 * This middleware must run after authenticate.
 */
export const requireAdmin: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });

    return;
  }

  if (req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      success: false,
      message: "Administrator access is required.",
    });

    return;
  }

  next();
};

/**
 * Allow specific roles to access an endpoint.
 *
 * Example:
 * requireRole(UserRole.ADMIN, UserRole.USER)
 *
 * This middleware must run after authenticate.
 */
export function requireRole(
  ...allowedRoles: UserRole[]
): RequestHandler {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });

      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });

      return;
    }

    next();
  };
}