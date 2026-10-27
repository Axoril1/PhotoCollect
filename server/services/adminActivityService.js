/**
 * QR Snap - Admin Activity Logging Service
 */

import AdminActivityLog from "../models/AdminActivityLog.js";

/**
 * Log an administrative activity
 */
export async function logAdminActivity({ adminId, adminEmail, action, resource = "", details = {}, req = null }) {
  try {
    const ip = req ? req.headers["x-forwarded-for"] || req.socket?.remoteAddress : "127.0.0.1";
    const userAgent = req ? req.headers["user-agent"] : "System";

    const log = await AdminActivityLog.create({
      adminId,
      adminEmail,
      action,
      resource,
      details,
      ip,
      userAgent,
      timestamp: new Date(),
    });

    return log;
  } catch (err) {
    console.error("[AdminActivityService] Error recording audit log:", err.message);
    return null;
  }
}

/**
 * Get paginated activity logs for an admin or system-wide
 */
export async function getAdminActivity(adminId = null, { page = 1, limit = 20 } = {}) {
  const query = {};
  if (adminId) query.adminId = adminId;

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AdminActivityLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    AdminActivityLog.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export default {
  logAdminActivity,
  getAdminActivity,
};
