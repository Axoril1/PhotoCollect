/**
 * QR Snap - Subscription & Feature Gating Express Middleware
 */

import { hasFeature } from "../services/featureService.js";
import { canCreateEvent, canUploadImages } from "../services/usageService.js";

/**
 * Middleware enforcing feature entitlement access
 * @param {String} featureKey - e.g. 'gallery.zip', 'branding.custom'
 */
export function requireFeature(featureKey) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // SUPER_ADMIN and ADMIN bypass plan feature gating
      if (req.user.role === "SUPER_ADMIN" || req.user.role === "ADMIN") {
        return next();
      }

      const allowed = await hasFeature(req.user._id, featureKey);
      if (!allowed) {
        return res.status(403).json({
          error: `Feature '${featureKey}' requires a higher subscription plan (Pro or Business).`,
          code: "FEATURE_LOCKED",
          requiredFeature: featureKey,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware enforcing event creation limit
 */
export async function requireEventLimit(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.user.role === "SUPER_ADMIN" || req.user.role === "ADMIN") {
      return next();
    }

    const allowed = await canCreateEvent(req.user._id);
    if (!allowed) {
      return res.status(403).json({
        error: "Active event limit reached for your subscription plan. Please upgrade to Pro for unlimited events.",
        code: "QUOTA_EXCEEDED",
        quotaType: "maxEvents",
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware enforcing storage and image upload quotas
 */
export async function requireUploadQuota(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.user.role === "SUPER_ADMIN" || req.user.role === "ADMIN") {
      return next();
    }

    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : req.file ? [req.file] : [];
    const count = files.length || 1;
    const totalSizeBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

    const check = await canUploadImages(req.user._id, count, totalSizeBytes);
    if (!check.allowed) {
      return res.status(403).json({
        error: check.reason,
        code: "QUOTA_EXCEEDED",
        quotaType: "storage_or_images",
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

export default {
  requireFeature,
  requireEventLimit,
  requireUploadQuota,
};
