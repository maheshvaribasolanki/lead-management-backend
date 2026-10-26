
import mongoose from "mongoose";
import { connectDB } from "../config/db";

import User from "../models/User";
import Invitation from "../models/Invitation";

async function checkModelIndexes(): Promise<void> {
  try {
    await connectDB();

    console.log("\nCreating/verifying User indexes...");
    await User.createIndexes();
    console.log("User indexes verified.");

    console.log("\nCreating/verifying Invitation indexes...");
    await Invitation.createIndexes();
    console.log("Invitation indexes verified.");

    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB database connection is unavailable.");
    }

    console.log("\nUser collection indexes:");
    console.dir(await db.collection("users").indexes(), {
      depth: null,
    });

    console.log("\nInvitation collection indexes:");
    console.dir(await db.collection("invitations").indexes(), {
      depth: null,
    });

    console.log("\nModel index verification completed.");
  } catch (error: unknown) {
    console.error(
      "\nModel index verification failed:",
      error instanceof Error ? error.message : error,
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

void checkModelIndexes();
