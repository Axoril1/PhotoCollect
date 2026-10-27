/**
 * QR Snap - Admin User & Role Management Service
 */

import bcrypt from "bcryptjs";
import User from "../models/User.js";
import AdminSession from "../models/AdminSession.js";
import { logAdminActivity } from "./adminActivityService.js";

const ADMIN_ROLES = ["SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "MODERATOR", "SUPPORT", "READ_ONLY_ADMIN"];

/**
 * List all admin users with pagination and search
 */
export async function listAdmins({ page = 1, limit = 20, role = "ALL", search = "" }) {
  const query = { role: { $in: ADMIN_ROLES } };

  if (role !== "ALL") query.role = role;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [admins, total] = await Promise.all([
    User.find(query).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(query),
  ]);

  return {
    admins,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Create a new administrator account (SUPER_ADMIN only)
 */
export async function createAdmin({ name, email, password, role = "ADMIN", customPermissions = [] }, reqAdmin) {
  if (reqAdmin.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: Only SUPER_ADMIN can create new admin accounts.");
  }

  if (!ADMIN_ROLES.includes(role)) {
    throw new Error(`Invalid admin role: ${role}`);
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new Error("A user account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = new User({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    customPermissions,
    status: "active",
    emailVerified: true,
    isVerified: true,
  });

  await admin.save();

  await logAdminActivity({
    adminId: reqAdmin._id,
    adminEmail: reqAdmin.email,
    action: "admin_created",
    resource: `Admin:${admin._id}`,
    details: { name, email, role },
  });

  const obj = admin.toObject();
  delete obj.password;
  return obj;
}

/**
 * Update Admin Role (SUPER_ADMIN only)
 */
export async function updateAdminRole(adminId, newRole, reqAdmin) {
  if (reqAdmin.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: Only SUPER_ADMIN can assign or update admin roles.");
  }

  const targetAdmin = await User.findById(adminId);
  if (!targetAdmin) throw new Error("Admin user not found.");

  // Safeguard: Prevent demoting the final Super Admin
  if (targetAdmin.role === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN") {
    const superAdminCount = await User.countDocuments({ role: "SUPER_ADMIN" });
    if (superAdminCount <= 1) {
      throw new Error("Cannot demote the final SUPER_ADMIN account.");
    }
  }

  const oldRole = targetAdmin.role;
  targetAdmin.role = newRole;
  await targetAdmin.save();

  await logAdminActivity({
    adminId: reqAdmin._id,
    adminEmail: reqAdmin.email,
    action: "admin_role_updated",
    resource: `Admin:${adminId}`,
    details: { oldRole, newRole },
  });

  return targetAdmin;
}

/**
 * Update Admin Status (Suspend / Reactivate)
 */
export async function updateAdminStatus(adminId, newStatus, reqAdmin) {
  if (reqAdmin.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: Only SUPER_ADMIN can suspend or reactivate admins.");
  }

  if (adminId.toString() === reqAdmin._id.toString()) {
    throw new Error("Security Error: You cannot suspend your own active account.");
  }

  const targetAdmin = await User.findById(adminId);
  if (!targetAdmin) throw new Error("Admin user not found.");

  if (targetAdmin.role === "SUPER_ADMIN" && newStatus === "SUSPENDED") {
    const activeSuperAdmins = await User.countDocuments({ role: "SUPER_ADMIN", status: "ACTIVE" });
    if (activeSuperAdmins <= 1) {
      throw new Error("Cannot suspend the final active SUPER_ADMIN.");
    }
  }

  targetAdmin.status = newStatus;
  await targetAdmin.save();

  await logAdminActivity({
    adminId: reqAdmin._id,
    adminEmail: reqAdmin.email,
    action: "admin_status_updated",
    resource: `Admin:${adminId}`,
    details: { newStatus },
  });

  return targetAdmin;
}

/**
 * Update Custom Admin Permissions
 */
export async function updateAdminPermissions(adminId, permissions, reqAdmin) {
  if (reqAdmin.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: Only SUPER_ADMIN can edit admin permission matrices.");
  }

  const targetAdmin = await User.findById(adminId);
  if (!targetAdmin) throw new Error("Admin user not found.");

  targetAdmin.customPermissions = permissions;
  await targetAdmin.save();

  await logAdminActivity({
    adminId: reqAdmin._id,
    adminEmail: reqAdmin.email,
    action: "admin_permissions_updated",
    resource: `Admin:${adminId}`,
    details: { permissions },
  });

  return targetAdmin;
}

/**
 * Delete Admin Account (SUPER_ADMIN only)
 */
export async function deleteAdmin(adminId, reqAdmin) {
  if (reqAdmin.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: Only SUPER_ADMIN can delete admin accounts.");
  }

  if (adminId.toString() === reqAdmin._id.toString()) {
    throw new Error("Security Error: You cannot delete your own active administrator account.");
  }

  const targetAdmin = await User.findById(adminId);
  if (!targetAdmin) throw new Error("Admin user not found.");

  if (targetAdmin.role === "SUPER_ADMIN") {
    const superAdminCount = await User.countDocuments({ role: "SUPER_ADMIN" });
    if (superAdminCount <= 1) {
      throw new Error("Security Error: Cannot delete the final SUPER_ADMIN in the system.");
    }
  }

  await User.findByIdAndDelete(adminId);

  await logAdminActivity({
    adminId: reqAdmin._id,
    adminEmail: reqAdmin.email,
    action: "admin_deleted",
    resource: `Admin:${adminId}`,
    details: { deletedEmail: targetAdmin.email },
  });

  return { message: "Administrator deleted successfully" };
}

/**
 * Get active sessions for an admin
 */
export async function getAdminSessions(adminId) {
  const sessions = await AdminSession.find({ adminId, isRevoked: false }).sort({ createdAt: -1 }).lean();
  return { sessions };
}

/**
 * Revoke active session
 */
export async function revokeAdminSession(adminId, sessionId, reqAdmin) {
  const session = await AdminSession.findOneAndUpdate(
    { _id: sessionId, adminId },
    { isRevoked: true },
    { new: true }
  );

  if (!session) throw new Error("Session not found or already revoked.");

  await logAdminActivity({
    adminId: reqAdmin._id,
    adminEmail: reqAdmin.email,
    action: "admin_session_revoked",
    resource: `Session:${sessionId}`,
    details: { targetAdminId: adminId },
  });

  return { message: "Session revoked successfully" };
}

export default {
  listAdmins,
  createAdmin,
  updateAdminRole,
  updateAdminStatus,
  updateAdminPermissions,
  deleteAdmin,
  getAdminSessions,
  revokeAdminSession,
};
