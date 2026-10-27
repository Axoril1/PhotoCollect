/**
 * QR Snap - Role-Based Access Control (RBAC)
 * Protected Admin Routes (/api/admin)
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../src/auth/requirePermission.js";
import { requireRole } from "../src/auth/requireRole.js";
import { Permissions } from "../src/auth/permissions.js";
import { Roles } from "../src/auth/roles.js";
import User from "../models/User.js";
import Event from "../models/Event.js";
import Photo from "../models/Photo.js";
import AuditLog from "../models/AuditLog.js";

const router = express.Router();

// Enforce base authentication for all admin routes
router.use(requireAuth);

/**
 * GET /api/admin/users
 * View all users across platform (ADMIN+)
 */
router.get(
  "/users",
  requirePermission(Permissions.USERS_READ),
  async (req, res, next) => {
    try {
      const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
      res.json({ users });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/admin/users/:id/suspend
 * Suspend an organizer or user (ADMIN+)
 * Rule: ADMIN cannot suspend SUPER_ADMIN accounts.
 */
router.patch(
  "/users/:id/suspend",
  requirePermission(Permissions.USERS_SUSPEND),
  async (req, res, next) => {
    try {
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Safeguard: ADMIN cannot suspend SUPER_ADMIN
      if (targetUser.role === Roles.SUPER_ADMIN) {
        return res.status(403).json({
          error: "Forbidden: Cannot modify or suspend a Super Admin account",
        });
      }

      targetUser.isSuspended = req.body.suspend !== false;
      targetUser.permissionsVersion = (targetUser.permissionsVersion || 1) + 1; // Revoke active sessions
      await targetUser.save();

      res.json({
        message: `User ${targetUser.isSuspended ? "suspended" : "unsuspended"} successfully`,
        user: {
          id: targetUser._id,
          email: targetUser.email,
          role: targetUser.role,
          isSuspended: targetUser.isSuspended,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/admin/users/:id
 * Delete a user account (SUPER_ADMIN only via users.delete permission)
 */
router.delete(
  "/users/:id",
  requirePermission(Permissions.USERS_DELETE),
  async (req, res, next) => {
    try {
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (targetUser.role === Roles.SUPER_ADMIN) {
        return res.status(403).json({ error: "Forbidden: Cannot delete Super Admin account" });
      }

      await targetUser.deleteOne();
      res.json({ message: "User deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/events
 * View all events across platform (ADMIN+)
 */
router.get(
  "/events",
  requirePermission(Permissions.EVENTS_READ),
  async (req, res, next) => {
    try {
      const events = await Event.find().populate("ownerId", "name email").sort({ createdAt: -1 });
      res.json({ events });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/moderation/photos
 * Review photos requiring moderation (ADMIN+)
 */
router.get(
  "/moderation/photos",
  requirePermission(Permissions.MODERATION_REVIEW),
  async (req, res, next) => {
    try {
      const photos = await Photo.find().sort({ createdAt: -1 }).limit(100);
      res.json({ photos });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/audit-logs
 * View security audit logs (ADMIN+)
 */
router.get(
  "/audit-logs",
  requirePermission(Permissions.AUDIT_READ),
  async (req, res, next) => {
    try {
      const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
      res.json({ logs });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/admin/system/settings
 * Modify system configuration (SUPER_ADMIN only via system.settings permission)
 */
router.patch(
  "/system/settings",
  requirePermission(Permissions.SYSTEM_SETTINGS),
  async (req, res, next) => {
    try {
      // System settings update implementation placeholder
      res.json({ message: "System configuration updated successfully", settings: req.body });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
