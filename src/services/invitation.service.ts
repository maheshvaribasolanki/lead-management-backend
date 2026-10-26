
import { createHash } from "node:crypto";
import mongoose from "mongoose";

import Invitation, {
  InvitationStatus,
} from "../models/Invitation";

import User, { UserStatus } from "../models/User";

/**
 * Invitation service error with an HTTP status code.
 */
export class InvitationServiceError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);

    this.name = "InvitationServiceError";
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Input required to accept an invitation.
 */
export interface AcceptInvitationInput {
  token: string;
  password: string;
  confirmPassword: string;
}

/**
 * Accept an invitation and activate the invited account.
 *
 * Security:
 * - The raw invitation token is never stored in the database.
 * - Only pending, unexpired invitations can be accepted.
 * - An invitation can be accepted only once.
 * - The user and invitation updates run in a transaction.
 */
export async function acceptInvitation(
  input: AcceptInvitationInput,
) {
  const tokenHash = createHash("sha256")
    .update(input.token)
    .digest("hex");

  const session = await mongoose.startSession();

  let acceptedUser:
    | {
        id: string;
        fullName: string;
        email: string;
        role: string;
        status: string;
      }
    | undefined;

  try {
    await session.withTransaction(async () => {
      const invitation = await Invitation.findOne({
        tokenHash,
        status: InvitationStatus.PENDING,
        expiresAt: { $gt: new Date() },
      }).session(session);

      if (!invitation) {
        throw new InvitationServiceError(
          "Invitation is invalid, expired, or already used.",
          400,
        );
      }

      const user = await User.findOne({
        email: invitation.email,
      })
        .session(session)
        .select("+password");

      if (!user) {
        throw new InvitationServiceError(
          "The invited user account could not be found.",
          404,
        );
      }

      if (user.status !== UserStatus.INVITED) {
        throw new InvitationServiceError(
          "This account is not awaiting invitation acceptance.",
          409,
        );
      }

      const now = new Date();

      user.password = input.password;
      user.status = UserStatus.ACTIVE;
      user.invitationAcceptedAt = now;
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;

      // The User model hashes the password before saving.
      await user.save({ session });

      invitation.status = InvitationStatus.ACCEPTED;
      invitation.acceptedAt = now;

      await invitation.save({ session });

      acceptedUser = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
      };
    });
  } finally {
    await session.endSession();
  }

  if (!acceptedUser) {
    throw new InvitationServiceError(
      "Invitation acceptance could not be completed.",
      500,
    );
  }

  return acceptedUser;
}
