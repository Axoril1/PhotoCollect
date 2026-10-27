/**
 * QR Snap - Organizer Business Intelligence & Analytics REST API
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import analyticsService from "../services/analyticsService.js";

const router = express.Router();

/**
 * POST /api/analytics/track
 * Public/Event attendee endpoint for logging QR scans and gallery views
 */
router.post("/track", async (req, res, next) => {
  try {
    const { ownerId, eventId, type, device, browser, os, country, metadata } = req.body;
    if (!ownerId || !type) {
      return res.status(400).json({ error: "ownerId and type are required" });
    }

    const eventRecord = await analyticsService.trackEvent({
      ownerId,
      eventId,
      type,
      device,
      browser,
      os,
      country,
      metadata,
    });

    res.json({ status: "logged", eventRecord });
  } catch (err) {
    next(err);
  }
});

// Protected organizer routes below
router.use(requireAuth);

/**
 * GET /api/analytics/overview
 */
router.get("/overview", async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await analyticsService.getOverview(req.user._id, { startDate, endDate });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/events
 */
router.get("/events", async (req, res, next) => {
  try {
    const data = await analyticsService.getEventAnalytics(req.user._id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/storage
 */
router.get("/storage", async (req, res, next) => {
  try {
    const data = await analyticsService.getStorageAnalytics(req.user._id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/uploads
 */
router.get("/uploads", async (req, res, next) => {
  try {
    const data = await analyticsService.getUploadAnalytics(req.user._id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/qr
 */
router.get("/qr", async (req, res, next) => {
  try {
    const data = await analyticsService.getQRAnalytics(req.user._id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/ai
 */
router.get("/ai", async (req, res, next) => {
  try {
    const data = await analyticsService.getAIAnalytics(req.user._id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/export
 * Download CSV report
 */
router.get("/export", async (req, res, next) => {
  try {
    const csvContent = await analyticsService.exportAnalyticsCSV(req.user._id);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="qrsnap_analytics_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

export default router;
