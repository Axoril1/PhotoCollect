import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import dns from "dns";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import photoRoutes from "./routes/photoRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminModerationRoutes from "./routes/adminModerationRoutes.js";
import adminStorageRoutes from "./routes/adminStorageRoutes.js";
import adminEventRoutes from "./routes/adminEventRoutes.js";
import adminReportRoutes, { publicReportRouter } from "./routes/adminReportRoutes.js";
import adminSettingsRoutes, { publicFeatureFlagsRouter } from "./routes/adminSettingsRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import adminSubscriptionRoutes from "./routes/adminSubscriptionRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminNotificationRoutes from "./routes/adminNotificationRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import brandingRoutes from "./routes/brandingRoutes.js";
import growthRoutes from "./routes/growthRoutes.js";
import adminGrowthRoutes from "./routes/adminGrowthRoutes.js";
import adminManagementRoutes from "./routes/adminManagementRoutes.js";
import { bootstrapSuperAdmin } from "./scripts/bootstrapSuperAdmin.js";
import organizerRoutes from "./routes/organizerRoutes.js";
import { apiLimiter } from "./middleware/rateLimits.js";
import { initSocketServer } from "./socket/socketServer.js";
import { moderationService } from "./src/services/moderation/moderationService.js";

// Set public DNS servers to resolve MongoDB Atlas SRV records correctly
dns.setServers(["1.1.1.1", "8.8.8.8"]);

dotenv.config();

// Startup Environment Variables Validation
const requiredEnv = [
  "MONGODB_URI",
  "CLIENT_URL",
  "APP_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "ACCESS_TOKEN_EXPIRY",
  "REFRESH_TOKEN_EXPIRY",
  "SESSION_COOKIE_NAME",
  "STORAGE_PROVIDER",
  "EMAIL_PROVIDER"
];

// Verify base required environment variables
requiredEnv.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`CRITICAL STARTUP ERROR: Environment variable ${envVar} is missing.`);
    process.exit(1);
  }
});

// Conditionally verify Cloudflare R2 variables if active
if (process.env.STORAGE_PROVIDER === "cloudflare-r2") {
  const r2Vars = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_URL"
  ];
  r2Vars.forEach(v => {
    if (!process.env[v]) {
      console.error(`CRITICAL STARTUP ERROR: Cloudflare R2 is the storage provider, but ${v} is missing.`);
      process.exit(1);
    }
  });
}

// Conditionally verify Resend variables if active
if (process.env.EMAIL_PROVIDER === "resend") {
  const resendVars = ["RESEND_API_KEY", "EMAIL_FROM"];
  resendVars.forEach(v => {
    if (!process.env[v]) {
      console.error(`CRITICAL STARTUP ERROR: Resend is the email provider, but ${v} is missing.`);
      process.exit(1);
    }
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxy headers (e.g. Render Load Balancer) for rate limiting & secure cookies
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://*.r2.cloudflarestorage.com", "*.r2.dev"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: "deny" },
  })
);

const clientUrl = process.env.CLIENT_URL;
app.use(
  cors({
    origin: clientUrl,
    credentials: true, // Allow cross-origin HttpOnly cookies exchange
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-event-password"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/reports", publicReportRouter);
app.use("/api/feature-flags", publicFeatureFlagsRouter);
app.use("/api/subscriptions-plans", subscriptionRoutes);
app.use("/api/admin/subscriptions-center", adminSubscriptionRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin/notifications-center", adminNotificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/branding", brandingRoutes);
app.use("/api/growth", growthRoutes);
app.use("/api/admin/growth-center", adminGrowthRoutes);
app.use("/api/admin/admins-center", adminManagementRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/moderation", adminModerationRoutes);
app.use("/api/admin/storage", adminStorageRoutes);
app.use("/api/admin/events-management", adminEventRoutes);
app.use("/api/admin/reports", adminReportRoutes);
app.use("/api/admin/settings-center", adminSettingsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/organizer", organizerRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
    provider: process.env.STORAGE_PROVIDER
  });
});

app.get("/", (req, res) => {
  const clientUrl = process.env.CLIENT_URL || "#";
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PhotoCollect API Service</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #0b0f19;
          color: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 1rem;
          box-sizing: border-box;
        }
        .container {
          background: #111827;
          border: 1px solid #1f2937;
          padding: 2.5rem;
          border-radius: 1rem;
          max-width: 480px;
          text-align: center;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }
        h1 {
          color: #6366f1;
          margin: 0 0 1rem;
          font-size: 1.75rem;
        }
        p {
          color: #9ca3af;
          font-size: 0.95rem;
          line-height: 1.5;
          margin-bottom: 2rem;
        }
        a {
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: #ffffff;
          text-decoration: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 600;
          display: inline-block;
          transition: transform 0.2s, opacity 0.2s;
        }
        a:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>PhotoCollect Backend</h1>
        <p>This is the API server. For the guest sharing gallery and admin dashboard, please visit the frontend web app:</p>
        <a href="${clientUrl}" target="_blank" rel="noopener noreferrer">Go to PhotoCollect App</a>
      </div>
    </body>
    </html>
  `);
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";
  
  // Print full error on the server logs
  console.error(err.stack || err);

  const statusCode = err.status || 500;
  
  // Sanitize internal database/server error details in production to block leaks
  let userMessage = err.message;
  if (isProduction && statusCode === 500) {
    userMessage = "An unexpected error occurred on the server.";
  }

  res.status(statusCode).json({
    error: userMessage,
  });
});

const PORT = process.env.PORT || 5000;

// Initialize server connection
let server;
connectDB().then(() => {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  initSocketServer(server);

  // Auto-bootstrap Super Admin if none exists
  bootstrapSuperAdmin().catch((err) => {
    console.error("⚠️ Super Admin Bootstrap Check Error:", err.message);
  });

  // Initialize and validate image moderation systems (Step 12)
  moderationService.initialize().catch((err) => {
    console.error("⚠️ Moderation Service failed to initialize on startup:", err.message);
  });
});

// Graceful shutdown listeners
const handleGracefulShutdown = (signal) => {
  console.log(`[Process] Received ${signal}. Initializing graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log("[Process] HTTP server closed.");
      try {
        await mongoose.connection.close();
        console.log("[Process] MongoDB connection closed.");
        process.exit(0);
      } catch (err) {
        console.error("[Process] Error closing Mongoose connection:", err.message);
        process.exit(1);
      }
    });

    // Force exit if shutdown hangs beyond 10s
    setTimeout(() => {
      console.error("[Process] Graceful shutdown timed out. Forcing termination.");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
