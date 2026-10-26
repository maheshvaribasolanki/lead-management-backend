import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";

import User, { UserStatus } from "../models/User";
import { env } from "../config/env";

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  timezone: string;
}

export interface LoginResult {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  user: AuthenticatedUser;
}

/**
 * Application authentication error.
 */
export class AuthServiceError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);

    this.name = "AuthServiceError";
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Authenticate a user and generate a JWT access token.
 */
export async function loginUser(
  input: LoginInput,
): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  // Retrieve the password explicitly because the User model
  // excludes it from queries by default.
  const user = await User.findOne({ email }).select("+password");

  // Do not reveal whether a particular email exists.
  if (!user) {
    throw new AuthServiceError(
      "Invalid email or password.",
      401,
    );
  }

  // Only active accounts can log in.
  if (user.status !== UserStatus.ACTIVE) {
    throw new AuthServiceError(
      "Your account is not active. Please contact your administrator.",
      403,
    );
  }

  const now = new Date();

  // Check whether the account is temporarily locked.
  if (user.lockUntil && user.lockUntil.getTime() > now.getTime()) {
    throw new AuthServiceError(
      "Your account is temporarily locked because of failed login attempts.",
      423,
    );
  }

  // Reset an expired lock before processing the new attempt.
  if (user.lockUntil && user.lockUntil.getTime() <= now.getTime()) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
  }

  // Compare the supplied password against the stored bcrypt hash.
  const passwordMatches = await bcrypt.compare(
    password,
    user.password,
  );

  if (!passwordMatches) {
    user.failedLoginAttempts += 1;

    // Lock the account after five consecutive failed attempts.
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    await user.save();

    if (user.lockUntil) {
      throw new AuthServiceError(
        "Your account is temporarily locked. Please try again later or contact your administrator.",
        423,
      );
    }

    throw new AuthServiceError(
      "Invalid email or password.",
      401,
    );
  }

  // Clear previous failed attempts after successful authentication.
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = now;

  await user.save();

  // Generate a signed JWT access token.
  const accessToken = jwt.sign(
    {
      sub: user.id,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"],
    },
  );

  // Return only the user fields that the client needs.
  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: env.ACCESS_TOKEN_TTL,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      timezone: user.timezone,
    },
  };
}