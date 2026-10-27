/**
 * QR Snap - Admin Management & Security Governance REST API
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../src/auth/requirePermission.js";
import { Permissions } from "../src/auth/permissions.js";
import adminManagementService from "../services/adminManagementService.js";
import adminActivityService from "../services/adminActivityService.js";

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/admin/admins
 * List all admin users with search and pagination
 */
router.get("/admins", requirePermission(Permissions.ADMINS_READ), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const { role = "ALL", search = "" } = req.query;

    const result = await adminManagementService.listAdmins({ page, limit, role, search });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/admins
 * Create a new administrator account (SUPER_ADMIN only)
 */
router.post("/admins", requirePermission(Permissions.ADMINS_CREATE), async (req, res, next) => {
  try {
    const { name, email, password, role = "ADMIN", customPermissions = [] } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const admin = await adminManagementService.createAdmin(
      { name, email, password, role, customPermissions },
      req.user
    );

    res.status(201).json({ message: "Admin account created successfully", admin });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/admins/:id/role
 * Promote or demote an administrator's role
 */
router.patch("/admins/:id/role", requirePermission(Permissions.ADMINS_UPDATE), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: "Role is required" });

    const admin = await adminManagementService.updateAdminRole(req.params.id, role, req.user);
    res.json({ message: "Admin role updated successfully", admin });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/admins/:id/status
 * Suspend or reactivate an admin account
 */
router.patch("/admins/:id/status", requirePermission(Permissions.ADMINS_UPDATE), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !["ACTIVE", "SUSPENDED"].includes(status)) {
      return res.status(400).json({ error: "Valid status (ACTIVE or SUSPENDED) is required" });
    }

    const admin = await adminManagementService.updateAdminStatus(req.params.id, status, req.user);
    res.json({ message: `Admin status updated to ${status}`, admin });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/admins/:id/permissions
 * Update custom permission matrix for an admin
 */
router.patch("/admins/:id/permissions", requirePermission(Permissions.ADMINS_UPDATE), async (req, res, next) => {
  try {
    const { permissions = [] } = req.body;
    const admin = await adminManagementService.updateAdminPermissions(req.params.id, permissions, req.user);
    res.json({ message: "Admin permissions updated successfully", admin });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/admins/:id
 * Delete an admin account (SUPER_ADMIN only)
 */
router.delete("/admins/:id", requirePermission(Permissions.ADMINS_DELETE), async (req, res, next) => {
  try {
    const result = await adminManagementService.deleteAdmin(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/admins/:id/activity
 * View activity audit logs for a specific admin
 */
router.get("/admins/:id/activity", requirePermission(Permissions.AUDIT_READ), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "20", 10);

    const result = await adminActivityService.getAdminActivity(req.params.id, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/admins/:id/sessions
 * View active sessions for an admin
 */
router.get("/admins/:id/sessions", requirePermission(Permissions.ADMINS_READ), async (req, res, next) => {
  try {
    const result = await adminManagementService.getAdminSessions(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/admins/:id/sessions/:sessionId
 * Revoke an active admin session
 */
router.delete("/admins/:id/sessions/:sessionId", requirePermission(Permissions.ADMINS_UPDATE), async (req, res, next) => {
  try {
    const result = await adminManagementService.revokeAdminSession(req.params.id, req.params.sessionId, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
