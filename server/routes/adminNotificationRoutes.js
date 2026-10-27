/**
 * QR Snap - Admin Notification Governance REST API
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../src/auth/requirePermission.js";
import { Permissions } from "../src/auth/permissions.js";
import Notification from "../models/Notification.js";
import notificationService from "../services/notificationService.js";
import logSecurityEvent from "../services/auditLogService.js";

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/admin/notifications
 * Paginated list of notifications across all users
 */
router.get("/notifications", requirePermission(Permissions.USERS_READ), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const skip = (page - 1) * limit;

    const { type, channel, status } = req.query;

    const query = {};
    if (type && type !== "ALL") query.type = type;
    if (channel && channel !== "ALL") query.channel = channel;
    if (status && status !== "ALL") query.status = status;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate("recipient", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    res.json({
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/notifications/broadcast
 * Broadcast announcement message to platform users
 */
router.post("/notifications/broadcast", requirePermission(Permissions.SETTINGS_UPDATE), async (req, res, next) => {
  try {
    const { title, message, targetRole = "ALL" } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required for broadcast" });
    }

    const result = await notificationService.broadcastAnnouncement({
      title,
      message,
      targetRole,
      adminUserId: req.user._id,
    });

    await logSecurityEvent({
      userId: req.user._id,
      event: "admin_announcement_broadcast",
      status: "success",
      req,
      details: { title, targetRole, broadcastCount: result.broadcastCount },
    });

    res.json({ message: "Announcement broadcast successfully", ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/notifications/:id
 * Delete a notification document
 */
router.delete("/notifications/:id", requirePermission(Permissions.SETTINGS_UPDATE), async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ error: "Notification not found" });

    res.json({ message: "Notification deleted successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
