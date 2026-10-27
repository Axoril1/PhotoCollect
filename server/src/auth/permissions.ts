/**
 * QR Snap - Role-Based Access Control (RBAC)
 * Centralized Permission Definitions
 */

export const Permissions = {
  // User Management
  USERS_READ: "users.read",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  USERS_SUSPEND: "users.suspend",

  // Event Management
  EVENTS_READ: "events.read",
  EVENTS_CREATE: "events.create",
  EVENTS_UPDATE: "events.update",
  EVENTS_DELETE: "events.delete",

  // Upload Management
  UPLOADS_CREATE: "uploads.create",
  UPLOADS_READ: "uploads.read",
  UPLOADS_DELETE: "uploads.delete",

  // Moderation
  MODERATION_REVIEW: "moderation.review",
  MODERATION_REJECT: "moderation.reject",
  MODERATION_APPROVE: "moderation.approve",

  // Analytics & Billing
  ANALYTICS_READ: "analytics.read",
  BILLING_MANAGE: "billing.manage",

  // System & Platform
  SYSTEM_SETTINGS: "system.settings",
  STORAGE_MANAGE: "storage.manage",
  AUDIT_READ: "audit.read",

  // Admin Management & Security
  ADMINS_READ: "admins.read",
  ADMINS_CREATE: "admins.create",
  ADMINS_UPDATE: "admins.update",
  ADMINS_DELETE: "admins.delete",
  SYSTEM_LOGS: "system.logs",
  SYSTEM_MONITOR: "system.monitor",
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const ALL_PERMISSIONS = Object.values(Permissions) as Permission[];

/**
 * Validates if a string is a valid system permission.
 */
export function isValidPermission(permissionStr: string): permissionStr is Permission {
  return ALL_PERMISSIONS.includes(permissionStr as Permission);
}
