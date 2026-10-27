/**
 * QR Snap - User Notification REST API
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import notificationService from "../services/notificationService.js";

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/notifications
 * Get authenticated user's in-app notifications
 */
router.get("/", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "20", 10);
    const unreadOnly = req.query.unreadOnly === "true";

    const result = await notificationService.getUserNotifications(req.user._id, { page, limit, unreadOnly });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
router.patch("/:id/read", async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.user._id, req.params.id);
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json({ message: "Notification marked as read", notification });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all user notifications as read
 */
router.patch("/read-all", async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
router.get("/preferences", async (req, res, next) => {
  try {
    const preferences = await notificationService.getPreferences(req.user._id);
    res.json({ preferences });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/preferences
 * Update user notification preferences
 */
router.patch("/preferences", async (req, res, next) => {
  try {
    const preferences = await notificationService.updatePreferences(req.user._id, req.body);
    res.json({ message: "Notification preferences updated", preferences });
  } catch (err) {
    next(err);
  }
});

export default router;
