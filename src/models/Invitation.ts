
import mongoose, {
  type Document,
  type Model,
  Schema,
  Types,
} from "mongoose";

/**
 * Invitation lifecycle statuses.
 */
export enum InvitationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
  REVOKED = "revoked",
}

/**
 * Invitation document interface.
 */
export interface IInvitation extends Document {
  email: string;
  role: "admin" | "user";

  tokenHash: string;

  status: InvitationStatus;

  invitedBy: Types.ObjectId;

  expiresAt: Date;
  acceptedAt?: Date;
  revokedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invitation model static methods.
 */
export interface IInvitationModel extends Model<IInvitation> {
  findPendingByEmail(email: string): Promise<IInvitation | null>;
}

/**
 * Invitation schema.
 */
const invitationSchema = new Schema<IInvitation, IInvitationModel>(
  {
    email: {
      type: String,
      required: [true, "Invitation email is required."],
      lowercase: true,
      trim: true,
      maxlength: [254, "Email address is too long."],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address.",
      ],
    },

    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
      required: true,
    },

    tokenHash: {
      type: String,
      required: [true, "Invitation token hash is required."],
      select: false,
    },

    status: {
      type: String,
      enum: Object.values(InvitationStatus),
      default: InvitationStatus.PENDING,
      required: true,
    },

    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Inviting administrator is required."],
    },

    expiresAt: {
      type: Date,
      required: [true, "Invitation expiry date is required."],
    },

    acceptedAt: {
      type: Date,
    },

    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

/**
 * Find the latest pending, unexpired invitation for an email.
 */
invitationSchema.statics.findPendingByEmail = function (
  email: string,
): Promise<IInvitation | null> {
  return this.findOne({
    email: email.trim().toLowerCase(),
    status: InvitationStatus.PENDING,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

/**
 * Database indexes.
 */
invitationSchema.index({ email: 1, status: 1 });
invitationSchema.index({ expiresAt: 1 });
invitationSchema.index({ invitedBy: 1, createdAt: -1 });
invitationSchema.index({ tokenHash: 1 }, { unique: true });

/**
 * Export the Invitation model.
 */
const Invitation =
  (mongoose.models.Invitation as IInvitationModel | undefined) ??
  mongoose.model<IInvitation, IInvitationModel>(
    "Invitation",
    invitationSchema,
  );

export default Invitation;
