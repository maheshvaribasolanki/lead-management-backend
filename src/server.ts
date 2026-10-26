import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB before accepting requests
    await connectDB();

    const server = app.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(
        `Health check: http://localhost:${env.PORT}/api/v1/health`,
      );
    });

    // Handle unexpected server errors
    server.on("error", (error: Error) => {
      console.error("HTTP server error:", error.message);
      process.exit(1);
    });
  } catch {
    console.error(
      "Server startup failed. Check your MongoDB connection and environment configuration.",
    );

    process.exit(1);
  }
}

void startServer();