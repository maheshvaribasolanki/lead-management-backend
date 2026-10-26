import mongoose from "mongoose";
import { env } from "./env";

export async function connectDB(): Promise<void> {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("MongoDB connected successfully.");
    console.log(`Database: ${mongoose.connection.name}`);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown database connection error";

    console.error("MongoDB connection failed:", message);

    throw error;
  }
}