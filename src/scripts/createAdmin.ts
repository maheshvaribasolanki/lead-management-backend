import mongoose from "mongoose";

import { connectDB } from "../config/db";
import User, { UserRole, UserStatus } from "../models/User";

async function createAdmin(): Promise<void> {
  try {
    const fullName = process.env.ADMIN_NAME?.trim();
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    // Validate the setup inputs.
    if (!fullName || !email || !password) {
      throw new Error(
        "Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD before running this script.",
      );
    }

    if (fullName.length < 2 || fullName.length > 100) {
      throw new Error("Admin name must contain between 2 and 100 characters.");
    }

    if (password.length < 10 || password.length > 72) {
      throw new Error("Admin password must contain between 10 and 72 characters.");
    }

    if (
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      throw new Error(
        "Password must include lowercase, uppercase, numeric, and special characters.",
      );
    }

    await connectDB();

    // Prevent this setup script from creating duplicate Admin accounts.
    const existingAdmin = await User.findOne({
      role: UserRole.ADMIN,
      status: { $ne: UserStatus.DELETED },
    });

    if (existingAdmin) {
      throw new Error(
        "An Admin account already exists. Initial Admin setup is not allowed again.",
      );
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error(
        "This email already belongs to an account. Use a different email or implement an account-promotion workflow.",
      );
    }

    const admin = await User.create({
      fullName,
      email,
      password,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      timezone: "Asia/Kolkata",
      invitationAcceptedAt: new Date(),
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
    });

    console.log("\nInitial Admin account created successfully.");
    console.log(`Name: ${admin.fullName}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
    console.log(`Status: ${admin.status}`);
    console.log("\nYou can now use these credentials to test the login API.");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred.";

    console.error("\nAdmin setup failed:", message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

void createAdmin();