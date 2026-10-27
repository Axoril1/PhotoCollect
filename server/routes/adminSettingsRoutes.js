/**
 * QR Snap - Platform Settings, Configuration & Feature Flags REST API
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../src/auth/requirePermission.js";
import { Permissions } from "../src/auth/permissions.js";
import PlatformConfig from "../models/PlatformConfig.js";
import logSecurityEvent from "../services/auditLogService.js";

const router = express.Router();

/**
 * Public Feature Flags Router for client applications
 */
export const publicFeatureFlagsRouter = express.Router();

const DEFAULT_CONFIGS = {
  // General Settings
  "general.platformName": { value: "QR Snap", category: "general" },
  "general.supportEmail": { value: "support@qrsnap.app", category: "general" },
  "general.timezone": { value: "UTC", category: "general" },
  "general.maintenanceMessage": { value: "QR Snap is under scheduled maintenance. We will return shortly.", category: "general" },

  // Upload Settings
  "uploads.maxUploadSizeBytes": { value: 15728640, category: "uploads" }, // 15MB
  "uploads.allowedFileTypes": { value: ["image/jpeg", "image/png", "image/webp", "image/heic"], category: "uploads" },
  "uploads.maxImagesPerUpload": { value: 25, category: "uploads" },
  "uploads.maxImagesPerEvent": { value: 500, category: "uploads" },
  "uploads.compressionQuality": { value: 85, category: "uploads" },

  // AI Moderation
  "moderation.enableGoogleVision": { value: true, category: "moderation" },
  "moderation.enableNsfwjs": { value: true, category: "moderation" },
  "moderation.autoApprovalThreshold": { value: 90, category: "moderation" },
  "moderation.autoRejectThreshold": { value: 95, category: "moderation" },

  // Storage
  "storage.provider": { value: process.env.STORAGE_PROVIDER || "r2", category: "storage" },
  "storage.signedUrlExpirationSeconds": { value: 3600, category: "storage" },

  // Security
  "security.adminSessionTimeoutMinutes": { value: 120, category: "security" },
  "security.maxLoginAttempts": { value: 5, category: "security" },
  "security.lockoutDurationMinutes": { value: 15, category: "security" },

  // Feature Flags
  "feature_flags.enableAiModeration": { value: true, category: "feature_flags" },
  "feature_flags.enableAnalytics": { value: true, category: "feature_flags" },
  "feature_flags.enableReports": { value: true, category: "feature_flags" },
  "feature_flags.enableDownloads": { value: true, category: "feature_flags" },
  "feature_flags.enableExperimental": { value: false, category: "feature_flags" },

  // Maintenance
  "maintenance.modeEnabled": { value: false, category: "maintenance" },
  "maintenance.whitelistedAdminsOnly": { value: true, category: "maintenance" },
};

// Seed default configs if missing
const ensureDefaultConfigs = async () => {
  try {
    const count = await PlatformConfig.countDocuments();
    if (count === 0) {
      const docs = Object.entries(DEFAULT_CONFIGS).map(([key, item]) => ({
        key,
        value: item.value,
        category: item.category,
        updatedByName: "System Defaults",
      }));
      await PlatformConfig.insertMany(docs);
    }
  } catch (err) {
    console.error("[PlatformConfig] Error seeding default configs:", err);
  }
};
ensureDefaultConfigs();

publicFeatureFlagsRouter.get("/", async (req, res) => {
  try {
    const flags = await PlatformConfig.find({ category: "feature_flags" }).lean();
    const flagMap = {};
    flags.forEach((f) => {
      flagMap[f.key.replace("feature_flags.", "")] = f.value;
    });

    const maintenanceDoc = await PlatformConfig.findOne({ key: "maintenance.modeEnabled" }).lean();
    flagMap.maintenanceMode = maintenanceDoc ? Boolean(maintenanceDoc.value) : false;

    res.json({ featureFlags: flagMap });
  } catch (err) {
    res.json({ featureFlags: { enableAiModeration: true, enableAnalytics: true, enableReports: true, enableDownloads: true } });
  }
});

// Protected Admin Settings Routes
router.use(requireAuth);

/**
 * GET /api/admin/settings
 * Fetch all platform configuration entries grouped by section
 */
router.get("/", requirePermission(Permissions.SETTINGS_READ), async (req, res, next) => {
  try {
    const configs = await PlatformConfig.find().sort({ category: 1, key: 1 }).lean();

    const configMap = {};
    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });

    res.json({ settings: configMap, rawConfigs: configs });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/settings/:section
 * Fetch settings for a specific category section
 */
router.get("/:section", requirePermission(Permissions.SETTINGS_READ), async (req, res, next) => {
  try {
    const { section } = req.params;
    const configs = await PlatformConfig.find({ category: section }).lean();

    const sectionMap = {};
    configs.forEach((c) => {
      sectionMap[c.key] = c.value;
    });

    res.json({ section, settings: sectionMap });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/settings/:section
 * Update settings for a specific section
 */
router.patch("/:section", requirePermission(Permissions.SETTINGS_UPDATE), async (req, res, next) => {
  try {
    const { section } = req.params;
    const updates = req.body; // Key-value pairs

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({ error: "Invalid updates payload" });
    }

    const updatedKeys = [];

    for (const [key, value] of Object.entries(updates)) {
      const fullKey = key.includes(".") ? key : `${section}.${key}`;
      
      const configDoc = await PlatformConfig.findOne({ key: fullKey });

      if (configDoc) {
        configDoc.value = value;
        configDoc.category = section;
        configDoc.updatedBy = req.user._id;
        configDoc.updatedByName = req.user.name || "Admin";
        configDoc.version = (configDoc.version || 1) + 1;
        await configDoc.save();
      } else {
        await PlatformConfig.create({
          key: fullKey,
          value,
          category: section,
          updatedBy: req.user._id,
          updatedByName: req.user.name || "Admin",
          version: 1,
        });
      }

      updatedKeys.push(fullKey);
    }

    await logSecurityEvent({
      userId: req.user._id,
      event: "config_changed",
      status: "success",
      req,
      details: { section, updatedKeys },
    });

    res.json({ message: `Successfully updated ${updatedKeys.length} setting(s) in ${section}`, updatedKeys });
  } catch (err) {
    next(err);
  }
});

export default router;
