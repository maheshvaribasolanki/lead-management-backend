
import mongoose, { Schema, type HydratedDocument } from "mongoose";

export enum LeadConfigurationType {
  STATUS = "status",
  SOURCE = "source",
  LOST_REASON = "lost_reason",
  TAG = "tag",
}

// Raw document fields: do not extend Document.
export interface ILeadConfiguration {
  name: string;
  type: LeadConfigurationType;
  description?: string;
  color?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type LeadConfigurationDocument =
  HydratedDocument<ILeadConfiguration>;

const leadConfigurationSchema = new Schema<ILeadConfiguration>(
  {
    name: {
      type: String,
      required: [true, "Configuration name is required."],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    type: {
      type: String,
      enum: Object.values(LeadConfigurationType),
      required: [true, "Configuration type is required."],
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    color: {
      type: String,
      trim: true,
      match: [
        /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
        "Color must be a valid hexadecimal color.",
      ],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Sort order must be an integer.",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

leadConfigurationSchema.index(
  { type: 1, name: 1 },
  {
    unique: true,
    collation: {
      locale: "en",
      strength: 2,
    },
  },
);

const LeadConfiguration = mongoose.model<ILeadConfiguration>(
  "LeadConfiguration",
  leadConfigurationSchema,
);

export default LeadConfiguration;
