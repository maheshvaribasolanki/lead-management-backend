import mongoose, { Types } from "mongoose";

import Lead from "../models/Lead";
import User from "../models/User";
import LeadConfiguration, {
  LeadConfigurationType,
} from "../models/LeadConfiguration";

import type {
  CreateLeadInput,
  UpdateLeadInput,
  ListLeadsQuery,
} from "../validators/lead.validator";

// Service errors.
export class LeadServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "LeadServiceError";
    this.statusCode = statusCode;
  }
}

// Logged-in user information.
interface LeadActor {
  userId: string;
  role: string;
}

// Validate and convert a MongoDB ID.
function validateObjectId(
  id: string,
  fieldName: string,
): Types.ObjectId {
  if (!mongoose.isValidObjectId(id)) {
    throw new LeadServiceError(`Invalid ${fieldName}.`, 400);
  }

  return new Types.ObjectId(id);
}

// Validate an active lead configuration.
async function validateConfiguration(
  id: string,
  type: LeadConfigurationType,
  fieldName: string,
): Promise<void> {
  const configurationId = validateObjectId(id, fieldName);

  const configuration = await LeadConfiguration.findOne()
    .where("_id")
    .equals(configurationId)
    .where("type")
    .equals(type)
    .where("isActive")
    .equals(true);

  if (!configuration) {
    throw new LeadServiceError(
      `${fieldName} does not exist or is inactive.`,
      400,
    );
  }
}

// Validate status, source, tags, and lost reason.
async function validateLeadConfigurations(
  input: Partial<CreateLeadInput>,
): Promise<void> {
  if (input.statusId) {
    await validateConfiguration(
      input.statusId,
      LeadConfigurationType.STATUS,
      "statusId",
    );
  }

  if (input.sourceId) {
    await validateConfiguration(
      input.sourceId,
      LeadConfigurationType.SOURCE,
      "sourceId",
    );
  }

  if (input.lostReasonId) {
    await validateConfiguration(
      input.lostReasonId,
      LeadConfigurationType.LOST_REASON,
      "lostReasonId",
    );
  }

  if (input.tags && input.tags.length > 0) {
    const tagIds = input.tags.map((tagId) =>
      validateObjectId(tagId, "tag ID"),
    );

    const uniqueTagIds = new Set(input.tags);

    const validTags = await LeadConfiguration.countDocuments()
      .where("_id")
      .in(tagIds)
      .where("type")
      .equals(LeadConfigurationType.TAG)
      .where("isActive")
      .equals(true);

    if (validTags !== uniqueTagIds.size) {
      throw new LeadServiceError(
        "One or more tags do not exist or are inactive.",
        400,
      );
    }
  }
}

// Validate the assigned lead owner.
async function validateLeadOwner(
  ownerId: string | null | undefined,
): Promise<void> {
  if (ownerId === undefined || ownerId === null) {
    return;
  }

  const id = validateObjectId(ownerId, "ownerId");

  // First, find the user using the ID only.
  const owner = await User.findById(id)
    .select("_id fullName role status")
    .exec();

  // Temporary diagnostic information.
  console.log("Lead owner validation:", {
    requestedOwnerId: ownerId,
    found: owner !== null,
    role: owner?.role,
    status: owner?.status,
    database: User.db.name,
    collection: User.collection.name,
  });

  // Check whether the user exists.
  if (!owner) {
    throw new LeadServiceError(
      "Lead owner not found in the connected database.",
      400,
    );
  }

  // Only regular users can be assigned as lead owners.
  if (owner.role !== "user") {
    throw new LeadServiceError(
      "Lead owner must have the user role.",
      400,
    );
  }

  // The account must be active.
  if (owner.status !== "active") {
    throw new LeadServiceError(
      "Lead owner must be active.",
      400,
    );
  }
}

// Create a lead.
export async function createLead(
  input: CreateLeadInput,
  actor: LeadActor,
) {
  await validateLeadConfigurations(input);

  let ownerId: Types.ObjectId | null = null;

  if (actor.role === "admin") {
    if (input.ownerId) {
      await validateLeadOwner(input.ownerId);
      ownerId = validateObjectId(input.ownerId, "ownerId");
    }
  } else {
    ownerId = validateObjectId(actor.userId, "userId");
  }

  const lead = await Lead.create({
    name: input.name,
    company: input.company,
    email: input.email,
    phone: input.phone,
    ownerId,
    statusId: validateObjectId(input.statusId, "statusId"),
    sourceId: input.sourceId
      ? validateObjectId(input.sourceId, "sourceId")
      : null,
    tags: (input.tags ?? []).map((tagId) =>
      validateObjectId(tagId, "tag ID"),
    ),
    lostReasonId: input.lostReasonId
      ? validateObjectId(input.lostReasonId, "lostReasonId")
      : null,
    createdBy: validateObjectId(actor.userId, "userId"),
  });

  return lead;
}

// List leads with pagination and filters.
export async function listLeads(
  query: ListLeadsQuery,
  actor: LeadActor,
) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);

  // Build the lead query.
  const leadQuery = Lead.find();

  if (actor.role !== "admin") {
    // Regular users can only see their own leads.
    leadQuery
      .where("ownerId")
      .equals(validateObjectId(actor.userId, "userId"));
  } else if (query.ownerId) {
    // Admins can filter leads by owner.
    leadQuery
      .where("ownerId")
      .equals(validateObjectId(query.ownerId, "ownerId"));
  }

  if (query.statusId) {
    leadQuery
      .where("statusId")
      .equals(validateObjectId(query.statusId, "statusId"));
  }

  if (query.sourceId) {
    leadQuery
      .where("sourceId")
      .equals(validateObjectId(query.sourceId, "sourceId"));
  }

  // Archived leads are returned only when requested.
  if (query.archived === "true") {
    leadQuery.where("archivedAt").ne(null);
  } else {
    leadQuery.where("archivedAt").equals(null);
  }

  // Search by name, company, email, or phone.
  if (query.search) {
    const escapedSearch = query.search.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    leadQuery.or([
      { name: { $regex: escapedSearch, $options: "i" } },
      { company: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
      { phone: { $regex: escapedSearch, $options: "i" } },
    ]);
  }

  // Build the matching count query.
  const countQuery = Lead.countDocuments();

  if (actor.role !== "admin") {
    countQuery
      .where("ownerId")
      .equals(validateObjectId(actor.userId, "userId"));
  } else if (query.ownerId) {
    countQuery
      .where("ownerId")
      .equals(validateObjectId(query.ownerId, "ownerId"));
  }

  if (query.statusId) {
    countQuery
      .where("statusId")
      .equals(validateObjectId(query.statusId, "statusId"));
  }

  if (query.sourceId) {
    countQuery
      .where("sourceId")
      .equals(validateObjectId(query.sourceId, "sourceId"));
  }

  if (query.archived === "true") {
    countQuery.where("archivedAt").ne(null);
  } else {
    countQuery.where("archivedAt").equals(null);
  }

  if (query.search) {
    const escapedSearch = query.search.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    countQuery.or([
      { name: { $regex: escapedSearch, $options: "i" } },
      { company: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
      { phone: { $regex: escapedSearch, $options: "i" } },
    ]);
  }

  const [leads, total] = await Promise.all([
    leadQuery
      .populate("ownerId", "fullName email")
      .populate("statusId", "name type color")
      .populate("sourceId", "name type")
      .populate("tags", "name type")
      .populate("lostReasonId", "name type")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    countQuery,
  ]);

  return {
    leads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Retrieve one lead by ID.
export async function getLeadById(
  leadId: string,
  actor: LeadActor,
) {
  const id = validateObjectId(leadId, "lead ID");

  const leadQuery = Lead.findOne()
    .where("_id")
    .equals(id)
    .where("archivedAt")
    .equals(null);

  if (actor.role !== "admin") {
    // Regular users can access only their own leads.
    leadQuery
      .where("ownerId")
      .equals(validateObjectId(actor.userId, "userId"));
  }

  const lead = await leadQuery
    .populate("ownerId", "fullName email")
    .populate("statusId", "name type color")
    .populate("sourceId", "name type")
    .populate("tags", "name type")
    .populate("lostReasonId", "name type");

  if (!lead) {
    throw new LeadServiceError(
      "Lead not found or you do not have permission to access it.",
      404,
    );
  }

  return lead;
}

// Update an existing lead.
export async function updateLead(
  leadId: string,
  input: UpdateLeadInput,
  actor: LeadActor,
) {
  const id = validateObjectId(leadId, "lead ID");

  const leadQuery = Lead.findOne()
    .where("_id")
    .equals(id)
    .where("archivedAt")
    .equals(null);

  if (actor.role !== "admin") {
    // Regular users can update only their own leads.
    leadQuery
      .where("ownerId")
      .equals(validateObjectId(actor.userId, "userId"));
  }

  const existingLead = await leadQuery;

  if (!existingLead) {
    throw new LeadServiceError(
      "Lead not found or you do not have permission to update it.",
      404,
    );
  }

  await validateLeadConfigurations(input);

  // Only administrators can change lead ownership.
  if (input.ownerId !== undefined && actor.role !== "admin") {
    throw new LeadServiceError(
      "Only administrators can change the lead owner.",
      403,
    );
  }

  // Validate a non-null owner before updating the lead.
  if (actor.role === "admin" && input.ownerId) {
    await validateLeadOwner(input.ownerId);
  }

  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.company !== undefined) {
    updateData.company = input.company;
  }

  if (input.email !== undefined) {
    updateData.email = input.email;
  }

  if (input.phone !== undefined) {
    updateData.phone = input.phone;
  }

  if (input.ownerId !== undefined) {
    updateData.ownerId = input.ownerId
      ? validateObjectId(input.ownerId, "ownerId")
      : null;
  }

  if (input.statusId !== undefined) {
    updateData.statusId = validateObjectId(
      input.statusId,
      "statusId",
    );
  }

  if (input.sourceId !== undefined) {
    updateData.sourceId = input.sourceId
      ? validateObjectId(input.sourceId, "sourceId")
      : null;
  }

  if (input.tags !== undefined) {
    updateData.tags = input.tags.map((tagId) =>
      validateObjectId(tagId, "tag ID"),
    );
  }

  if (input.lostReasonId !== undefined) {
    updateData.lostReasonId = input.lostReasonId
      ? validateObjectId(input.lostReasonId, "lostReasonId")
      : null;
  }

  existingLead.set(updateData);

  await existingLead.save();

  return existingLead;
}