/**
 * QR Snap - User & Organizer Management Center API Routes
 * High-performance, paginated, searchable REST endpoints for admin management
 */

import express from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../src/auth/requirePermission.js";
import { Permissions } from "../src/auth/permissions.js";
import { Roles, normalizeRole } from "../src/auth/roles.js";
import User from "../models/User.js";
import Event from "../models/Event.js";
import Photo from "../models/Photo.js";
import Session from "../models/Session.js";
import AuditLog from "../models/AuditLog.js";
import UserNote from "../models/UserNote.js";
import logSecurityEvent from "../services/auditLogService.js";

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/admin/users
 * High-performance server-side paginated user listing with search, filtering, and sorting
 */
router.get("/", requirePermission(Permissions.USERS_READ), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "15", 10)));
    const skip = (page - 1) * limit;

    const { search, role, status, emailVerified, plan, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const query = {};

    // Filter by role
    if (role && role !== "ALL") {
      query.role = normalizeRole(role);
    }

    // Filter by status
    if (status && status !== "ALL") {
      if (status === "suspended") {
        query.$or = [{ status: "suspended" }, { isSuspended: true }];
      } else {
        query.status = status;
      }
    }

    // Filter by email verification status
    if (emailVerified !== undefined && emailVerified !== "ALL") {
      query.emailVerified = emailVerified === "true";
    }

    // Filter by subscription plan
    if (plan && plan !== "ALL") {
      query.plan = plan;
    }

    // Server-side search across Name, Email, Phone, or ID
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { organizationName: searchRegex },
      ];
      if (search.trim().length === 24) {
        query.$or.push({ _id: search.trim() });
      }
    }

    const sortOption = {};
    sortOption[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(query).select("-passwordHash").sort(sortOption).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/users/:id
 * Detailed user profile overview with storage, photo count, event count, and activity
 */
router.get("/:id", requirePermission(Permissions.USERS_READ), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash").lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Aggregate User Platform Statistics
    const eventsCreatedCount = await Event.countDocuments({ ownerId: user._id });
    const userEvents = await Event.find({ ownerId: user._id }).select("_id").lean();
    const eventIds = userEvents.map((e) => e._id);

    const [photosCount, activeSessionsCount, storageAgg] = await Promise.all([
      Photo.countDocuments({ eventId: { $in: eventIds } }),
      Session.countDocuments({ userId: user._id }),
      Photo.aggregate([
        { $match: { eventId: { $in: eventIds } } },
        { $group: { _id: null, totalBytes: { $sum: "$sizeBytes" } } },
      ]),
    ]);

    const totalStorageBytes = storageAgg.length > 0 ? storageAgg[0].totalBytes : 0;

    // Fetch recent activity audit logs
    const recentActivity = await AuditLog.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      user,
      stats: {
        eventsCreated: eventsCreatedCount,
        photosUploaded: photosCount,
        activeSessions: activeSessionsCount,
        totalStorageBytes,
      },
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user profile details or role.
 * Rule: ADMIN cannot modify SUPER_ADMIN accounts.
 */
router.patch("/:id", requirePermission(Permissions.USERS_UPDATE), async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentAdminRole = normalizeRole(req.user.role);

    // Safeguard: ADMIN cannot modify SUPER_ADMIN
    if (targetUser.role === Roles.SUPER_ADMIN && currentAdminRole !== Roles.SUPER_ADMIN) {
      return res.status(403).json({
        error: "Forbidden: Cannot modify a Super Admin account",
      });
    }

    const { name, email, phone, organizationName, plan, role } = req.body;

    if (name) targetUser.name = String(name).trim();
    if (email) targetUser.email = String(email).trim().toLowerCase();
    if (phone !== undefined) targetUser.phone = String(phone).trim();
    if (organizationName !== undefined) targetUser.organizationName = String(organizationName).trim();
    if (plan && ["free", "pro", "studio"].includes(plan)) targetUser.plan = plan;

    // Role modification check
    if (role && role !== targetUser.role) {
      // ADMIN cannot promote anyone to SUPER_ADMIN
      if (normalizeRole(role) === Roles.SUPER_ADMIN && currentAdminRole !== Roles.SUPER_ADMIN) {
        return res.status(403).json({
          error: "Forbidden: Only Super Admins can assign the Super Admin role",
        });
      }

      const oldRole = targetUser.role;
      targetUser.role = normalizeRole(role);
      targetUser.permissionsVersion = (targetUser.permissionsVersion || 1) + 1; // Revoke old sessions

      await logSecurityEvent({
        userId: req.user._id,
        event: "role_changed",
        status: "success",
        req,
        details: { targetUserId: targetUser._id, oldRole, newRole: targetUser.role },
      });
    }

    await targetUser.save();

    await logSecurityEvent({
      userId: req.user._id,
      event: "user_modified",
      status: "success",
      req,
      details: { targetUserId: targetUser._id },
    });

    res.json({
      message: "User updated successfully",
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        organizationName: targetUser.organizationName,
        plan: targetUser.plan,
        role: targetUser.role,
        status: targetUser.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Change user status (active, suspended, pending, deleted, banned)
 */
router.patch("/:id/status", requirePermission(Permissions.USERS_SUSPEND), async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.role === Roles.SUPER_ADMIN) {
      return res.status(403).json({ error: "Forbidden: Cannot alter status of a Super Admin" });
    }

    const { status } = req.body;
    if (!["active", "suspended", "pending", "deleted", "banned"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    targetUser.status = status;
    targetUser.isSuspended = status === "suspended" || status === "banned" || status === "deleted";
    targetUser.permissionsVersion = (targetUser.permissionsVersion || 1) + 1; // Immediately revoke tokens
    await targetUser.save();

    await logSecurityEvent({
      userId: req.user._id,
      event: "account_suspended",
      status: "success",
      req,
      details: { targetUserId: targetUser._id, newStatus: status },
    });

    res.json({ message: `User status changed to ${status}`, status: targetUser.status });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/users/:id
 * Permanent Delete (SUPER_ADMIN only via users.delete permission)
 */
router.delete("/:id", requirePermission(Permissions.USERS_DELETE), async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.role === Roles.SUPER_ADMIN) {
      return res.status(403).json({ error: "Forbidden: Cannot delete Super Admin account" });
    }

    await Session.deleteMany({ userId: targetUser._id });
    await targetUser.deleteOne();

    await logSecurityEvent({
      userId: req.user._id,
      event: "account_deleted",
      status: "success",
      req,
      details: { targetUserId: req.params.id },
    });

    res.json({ message: "User account permanently deleted" });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/users/:id/sessions
 * Terminate all active sessions for target user
 */
router.delete("/:id/sessions", requirePermission(Permissions.USERS_UPDATE), async (req, res, next) => {
  try {
    const deleteResult = await Session.deleteMany({ userId: req.params.id });

    await logSecurityEvent({
      userId: req.user._id,
      event: "admin_revoked_sessions",
      status: "success",
      req,
      details: { targetUserId: req.params.id, revokedCount: deleteResult.deletedCount },
    });

    res.json({ message: `Terminated ${deleteResult.deletedCount} active session(s)` });
  } catch (err) {
    next(err);
  }
});

/**
 * Internal Admin Notes Endpoints (Admin-only notes)
 */
router.get("/:id/notes", requirePermission(Permissions.USERS_READ), async (req, res, next) => {
  try {
    const notes = await UserNote.find({ userId: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json({ notes });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/notes", requirePermission(Permissions.USERS_UPDATE), async (req, res, next) => {
  try {
    const content = String(req.body.content || "").trim();
    if (!content) {
      return res.status(400).json({ error: "Note content is required" });
    }

    const note = await UserNote.create({
      userId: req.params.id,
      adminId: req.user._id,
      adminName: req.user.name || "Admin",
      content,
    });

    res.status(201).json({ note });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/organizers
 * Paginated listing specifically filtered for Organizers with aggregated event & upload counts
 */
router.get("/organizers/list", requirePermission(Permissions.USERS_READ), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "15", 10)));
    const skip = (page - 1) * limit;

    const { search, status, plan } = req.query;

    const query = { role: Roles.ORGANIZER };

    if (status && status !== "ALL") query.status = status;
    if (plan && plan !== "ALL") query.plan = plan;

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { organizationName: searchRegex },
      ];
    }

    const [organizers, total] = await Promise.all([
      User.find(query).select("-passwordHash").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    // Enhance each organizer with event count
    const organizerIds = organizers.map((o) => o._id);
    const eventCounts = await Event.aggregate([
      { $match: { ownerId: { $in: organizerIds } } },
      { $group: { _id: "$ownerId", count: { $sum: 1 } } },
    ]);

    const eventCountMap = {};
    eventCounts.forEach((item) => {
      eventCountMap[item._id.toString()] = item.count;
    });

    const enriched = organizers.map((o) => ({
      ...o,
      eventsCount: eventCountMap[o._id.toString()] || 0,
    }));

    res.json({
      organizers: enriched,
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

export default router;
