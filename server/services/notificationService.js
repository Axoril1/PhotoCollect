/**
 * QR Snap - Centralized Notification Dispatcher & Queue Service
 */

import Notification from "../models/Notification.js";
import NotificationPreference from "../models/NotificationPreference.js";
import User from "../models/User.js";
import { sendNotificationToUser } from "../socket/socketServer.js";
import emailService from "../email/EmailService.js";

/**
 * Get or initialize user notification preferences
 */
export async function getPreferences(userId) {
  let prefs = await NotificationPreference.findOne({ userId });
  if (!prefs) {
    prefs = await NotificationPreference.create({ userId });
  }
  return prefs;
}

/**
 * Update user notification preferences
 */
export async function updatePreferences(userId, updateData) {
  const prefs = await NotificationPreference.findOneAndUpdate(
    { userId },
    { $set: updateData },
    { new: true, upsert: true }
  );
  return prefs;
}

/**
 * Centralized Notification Dispatcher
 */
export async function sendNotification({
  recipientId,
  type = "SYSTEM_ALERT",
  channel = "in_app",
  title,
  message,
  priority = "NORMAL",
  metadata = {},
  emailTemplate = null,
  emailData = {},
}) {
  try {
    const prefs = await getPreferences(recipientId);

    // Check category preferences
    if (type.includes("UPLOAD") && !prefs.uploads) return null;
    if (type.includes("BILLING") && !prefs.billing) return null;
    if (type.includes("MODERATION") && !prefs.moderation) return null;
    if (type.includes("SECURITY") && !prefs.security) return null;

    // 1. Create In-App Notification Record
    let notification = null;
    if (prefs.inAppEnabled || channel === "in_app") {
      notification = await Notification.create({
        recipient: recipientId,
        type,
        channel,
        title,
        message,
        priority,
        metadata,
        status: "DELIVERED",
      });

      // Emit live Socket.IO push event
      sendNotificationToUser(recipientId, notification);
    }

    // 2. Queue Email Dispatch asynchronously
    if ((prefs.emailEnabled || channel === "email") && emailTemplate) {
      const user = await User.findById(recipientId).select("email name").lean();
      if (user && user.email) {
        emailService
          .sendEmail({
            to: user.email,
            templateName: emailTemplate,
            templateData: { name: user.name, title, message, ...emailData },
          })
          .catch((err) => console.error(`[NotificationService] Async email error for ${user.email}:`, err.message));
      }
    }

    return notification;
  } catch (err) {
    console.error("[NotificationService] Error sending notification:", err.message);
    throw err;
  }
}

/**
 * Fetch paginated in-app notifications for user
 */
export async function getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const query = { recipient: userId };
  if (unreadOnly) query.read = false;

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipient: userId, read: false }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { read: true, readAt: new Date() } },
    { new: true }
  );
  return notification;
}

/**
 * Mark all user notifications as read
 */
export async function markAllAsRead(userId) {
  await Notification.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
  return { success: true };
}

/**
 * Admin System Announcement Broadcast
 */
export async function broadcastAnnouncement({ title, message, targetRole = "ALL", adminUserId }) {
  const userQuery = targetRole === "ALL" ? {} : { role: targetRole };
  const users = await User.find(userQuery).select("_id").lean();

  const notifications = users.map((u) => ({
    recipient: u._id,
    type: "ADMIN_ANNOUNCEMENT",
    channel: "in_app",
    title,
    message,
    priority: "HIGH",
    metadata: { broadcastBy: adminUserId },
    status: "DELIVERED",
  }));

  const createdDocs = await Notification.insertMany(notifications);

  // Broadcast to online socket rooms
  for (const u of users) {
    sendNotificationToUser(u._id, {
      type: "ADMIN_ANNOUNCEMENT",
      title,
      message,
      priority: "HIGH",
      createdAt: new Date(),
    });
  }

  return { broadcastCount: createdDocs.length };
}

export default {
  getPreferences,
  updatePreferences,
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  broadcastAnnouncement,
};
