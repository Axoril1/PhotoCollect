/**
 * QR Snap - White-label Branding & Custom Domain REST API
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireFeature } from "../middleware/subscriptionMiddleware.js";
import { upload } from "../middleware/upload.js";
import brandingService from "../services/brandingService.js";
import domainService from "../services/domainService.js";
import { storageService } from "../services/storageService.js";

const router = express.Router();

/**
 * GET /api/branding/public/:identifier
 * Public endpoint for gallery theme resolution (Domain or OwnerId)
 */
router.get("/public/:identifier", async (req, res, next) => {
  try {
    const branding = await brandingService.getPublicBranding(req.params.identifier);
    res.json({ branding });
  } catch (err) {
    next(err);
  }
});

// Protected routes below
router.use(requireAuth);

/**
 * GET /api/branding
 * Get current authenticated user's white-label branding configuration
 */
router.get("/", async (req, res, next) => {
  try {
    const branding = await brandingService.getBranding(req.user._id);
    res.json({ branding });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/branding
 * Update branding configuration (Business Plan Feature Gated)
 */
router.patch("/", requireFeature("branding.custom"), async (req, res, next) => {
  try {
    const branding = await brandingService.updateBranding(req.user._id, req.body);
    res.json({ message: "Branding configuration updated successfully", branding });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/branding/logo
 * Upload custom brand logo (Business Plan Feature Gated)
 */
router.post("/logo", requireFeature("branding.custom"), upload.single("logo"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image file uploaded" });

    const stored = await storageService.storePhoto(req.file, { slug: "branding" }, req);
    const branding = await brandingService.updateBranding(req.user._id, { logoUrl: stored.originalUrl });

    res.json({ message: "Logo uploaded successfully", logoUrl: stored.originalUrl, branding });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/branding/favicon
 * Upload custom brand favicon (Business Plan Feature Gated)
 */
router.post("/favicon", requireFeature("branding.custom"), upload.single("favicon"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No favicon file uploaded" });

    const stored = await storageService.storePhoto(req.file, { slug: "branding" }, req);
    const branding = await brandingService.updateBranding(req.user._id, { faviconUrl: stored.originalUrl });

    res.json({ message: "Favicon uploaded successfully", faviconUrl: stored.originalUrl, branding });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/branding/verify-domain
 * Perform DNS TXT record verification lookup
 */
router.post("/verify-domain", requireFeature("branding.custom"), async (req, res, next) => {
  try {
    const { customDomain } = req.body;
    const result = await domainService.verifyDomainDNS(req.user._id, customDomain);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/branding/domain-status
 * Get custom domain verification & SSL status
 */
router.get("/domain-status", async (req, res, next) => {
  try {
    const status = await domainService.getDomainStatus(req.user._id);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

export default router;
