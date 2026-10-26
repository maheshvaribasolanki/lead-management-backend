
import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env";

import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import leadConfigurationRoutes from "./routes/lead-configuration.routes";
import leadRoutes from "./routes/lead.routes";

const app = express();

/**
 * ==========================================
 * SECURITY MIDDLEWARE
 * ==========================================
 */

app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

/**
 * ==========================================
 * REQUEST PARSING MIDDLEWARE
 * ==========================================
 */

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  }),
);

/**
 * ==========================================
 * HEALTH CHECK
 * ==========================================
 *
 * GET /api/v1/health
 * Access: Public
 */

app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Lead Management API is running.",
    timestamp: new Date().toISOString(),
  });
});

/**
 * ==========================================
 * ROOT ENDPOINT
 * ==========================================
 *
 * GET /
 * Access: Public
 */

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to the Lead Management Backend.",
  });
});

/**
 * ==========================================
 * AUTHENTICATION ROUTES
 * ==========================================
 *
 * Base URL: /api/v1/auth
 */

app.use("/api/v1/auth", authRoutes);

/**
 * ==========================================
 * ADMIN USER ROUTES
 * ==========================================
 *
 * Base URL: /api/v1/admin
 */

app.use("/api/v1/admin", adminRoutes);

/**
 * ==========================================
 * LEAD CONFIGURATION ROUTES
 * ==========================================
 *
 * Base URL: /api/v1/admin/lead-configurations
 *
 * POST   /api/v1/admin/lead-configurations
 * GET    /api/v1/admin/lead-configurations
 * GET    /api/v1/admin/lead-configurations/:id
 * PATCH  /api/v1/admin/lead-configurations/:id
 * PATCH  /api/v1/admin/lead-configurations/:id/deactivate
 *
 * Access: Admin only
 */

app.use(
  "/api/v1/admin/lead-configurations",
  leadConfigurationRoutes,
);

/**
 * ==========================================
 * LEAD ROUTES
 * ==========================================
 *
 * Base URL: /api/v1/leads
 *
 * POST   /api/v1/leads
 * GET    /api/v1/leads
 * GET    /api/v1/leads/:id
 * PATCH  /api/v1/leads/:id
 *
 * Access: Authenticated users
 */

app.use("/api/v1/leads", leadRoutes);

/**
 * ==========================================
 * 404 HANDLER
 * ==========================================
 *
 * This must remain after all registered routes.
 */

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: "API endpoint not found.",
  });
});

export default app;
