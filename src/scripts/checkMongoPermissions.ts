import mongoose from "mongoose";
import { connectDB } from "../config/db";

async function checkMongoPermissions(): Promise<void> {
  try {
    await connectDB();

    const result = await mongoose.connection.db!.admin().command({
      connectionStatus: 1,
      showPrivileges: true,
    });

    console.log("\nAuthenticated users:");
    console.dir(result.authInfo?.authenticatedUsers, { depth: null });

    console.log("\nAuthenticated user roles:");
    console.dir(result.authInfo?.authenticatedUserRoles, { depth: null });

    console.log("\nTesting read access to Management.users:");

    const db = mongoose.connection.db!;
    const result2 = await db
      .collection("users")
      .findOne({}, { projection: { _id: 1 } });

    console.log("Read permission works:", result2 !== undefined);
  } catch (error: unknown) {
    console.error(
      "MongoDB diagnostic failed:",
      error instanceof Error ? error.message : error,
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

void checkMongoPermissions();