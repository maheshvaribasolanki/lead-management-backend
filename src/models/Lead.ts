import mongoose, {
  Schema,
  Types,
  type HydratedDocument,
} from "mongoose";

// Lead data structure.
export interface ILead {
  name: string;
  company?: string;
  email?: string;
  phone?: string;

  // The user responsible for this lead.
  ownerId: Types.ObjectId | null;

  // References to LeadConfiguration documents.
  statusId: Types.ObjectId;
  sourceId?: Types.ObjectId | null;
  tags: Types.ObjectId[];
  lostReasonId?: Types.ObjectId | null;

  // The user who created the lead.
  createdBy: Types.ObjectId;

  // Used for archiving instead of immediately deleting.
  archivedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type LeadDocument = HydratedDocument<ILead>;

// Lead MongoDB schema.
const leadSchema = new Schema<ILead>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    company: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    statusId: {
      type: Schema.Types.ObjectId,
      ref: "LeadConfiguration",
      required: true,
    },

    sourceId: {
      type: Schema.Types.ObjectId,
      ref: "LeadConfiguration",
      default: null,
    },

    tags: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "LeadConfiguration",
        },
      ],
      default: [],
    },

    lostReasonId: {
      type: Schema.Types.ObjectId,
      ref: "LeadConfiguration",
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Indexes for common lead searches.
leadSchema.index({ ownerId: 1, createdAt: -1 });
leadSchema.index({ statusId: 1, createdAt: -1 });
leadSchema.index({ sourceId: 1 });
leadSchema.index({ archivedAt: 1 });

const Lead = mongoose.model<ILead>("Lead", leadSchema);

export default Lead;