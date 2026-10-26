import mongoose, {
  type Document,
  type Model,
  Schema,
} from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../config/env";

/**
 * User roles.
 *
 * Admin: Can access administrative features according to permissions.
 * User: Can access permitted features and their own data.
 */
export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

/**
 * Account lifecycle statuses.
 */
export enum UserStatus {
  INVITED = "invited",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  DEACTIVATED = "deactivated",
  PENDING_DELETION = "pending_deletion",
  DELETED = "deleted",
}

/**
 * User document interface.
 */
export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;

  role: UserRole;
  status: UserStatus;

  phone?: string;
  employeeId?: string;
  timezone: string;
  joiningDate?: Date;

  invitationAcceptedAt?: Date;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;

  failedLoginAttempts: number;
  lockUntil?: Date;

  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * User model static methods.
 */
export interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

/**
 * User schema.
 */
const userSchema = new Schema<IUser, IUserModel>(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required."],
      trim: true,
      minlength: [2, "Full name must contain at least 2 characters."],
      maxlength: [100, "Full name cannot exceed 100 characters."],
    },

    email: {
      type: String,
      required: [true, "Email address is required."],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, "Email address is too long."],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address.",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [10, "Password must contain at least 10 characters."],
      select: false,
    },

    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.INVITED,
      required: true,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: [25, "Phone number cannot exceed 25 characters."],
    },

    employeeId: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [50, "Employee ID cannot exceed 50 characters."],
      sparse: true,
      unique: true,
    },

    timezone: {
      type: String,
      trim: true,
      default: "Asia/Kolkata",
      required: true,
    },

    joiningDate: {
      type: Date,
    },

    invitationAcceptedAt: {
      type: Date,
    },

    lastLoginAt: {
      type: Date,
    },

    passwordChangedAt: {
      type: Date,
    },

    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    lockUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

/**
 * Hash passwords before saving.
 * Only hashes the password when it has changed.
 */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const password = this.password;

  if (password.length < 10) {
    throw new Error("Password must contain at least 10 characters.");
  }

  if (password.length > 72) {
    throw new Error("Password cannot exceed 72 bytes for bcrypt.");
  }

  this.password = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  if (this.isNew || this.isModified("password")) {
    this.passwordChangedAt = new Date();
  }
});

/**
 * Compare a supplied password with the stored password hash.
 */
userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Find a user by normalized email address.
 * Password remains excluded unless explicitly requested.
 */
userSchema.statics.findByEmail = function (
  email: string,
): Promise<IUser | null> {
  return this.findOne({
    email: email.trim().toLowerCase(),
  });
};

/**
 * Database indexes.
 */
userSchema.index({ status: 1, role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLoginAt: -1 });

/**
 * Export the User model.
 */
const User =
  (mongoose.models.User as IUserModel | undefined) ??
  mongoose.model<IUser, IUserModel>("User", userSchema);

export default User;