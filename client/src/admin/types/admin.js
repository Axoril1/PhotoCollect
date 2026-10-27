/**
 * QR Snap - Admin Application Types & Constants
 */

export const ADMIN_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  ORGANIZER: "ORGANIZER",
  GUEST: "GUEST",
};

export const ADMIN_PERMISSIONS = {
  USERS_READ: "users.read",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  USERS_SUSPEND: "users.suspend",
  EVENTS_READ: "events.read",
  EVENTS_CREATE: "events.create",
  EVENTS_UPDATE: "events.update",
  EVENTS_DELETE: "events.delete",
  UPLOADS_CREATE: "uploads.create",
  UPLOADS_READ: "uploads.read",
  UPLOADS_DELETE: "uploads.delete",
  MODERATION_REVIEW: "moderation.review",
  MODERATION_REJECT: "moderation.reject",
  MODERATION_APPROVE: "moderation.approve",
  ANALYTICS_READ: "analytics.read",
  BILLING_MANAGE: "billing.manage",
  SYSTEM_SETTINGS: "system.settings",
  STORAGE_MANAGE: "storage.manage",
  AUDIT_READ: "audit.read",
};

export const SIDEBAR_NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    path: "/admin/dashboard",
  },
  {
    id: "users",
    label: "Users",
    icon: "Users",
    path: "/admin/users",
    permission: ADMIN_PERMISSIONS.USERS_READ,
  },
  {
    id: "events",
    label: "Events",
    icon: "Calendar",
    path: "/admin/events",
    permission: ADMIN_PERMISSIONS.EVENTS_READ,
  },
  {
    id: "moderation",
    label: "Moderation",
    icon: "ShieldAlert",
    path: "/admin/moderation",
    permission: ADMIN_PERMISSIONS.MODERATION_REVIEW,
  },
  {
    id: "reports",
    label: "Reports",
    icon: "FileBarChart",
    path: "/admin/reports",
  },
  {
    id: "storage",
    label: "Storage",
    icon: "HardDrive",
    path: "/admin/storage",
    permission: ADMIN_PERMISSIONS.STORAGE_MANAGE,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: "TrendingUp",
    path: "/admin/analytics",
    permission: ADMIN_PERMISSIONS.ANALYTICS_READ,
  },
  {
    id: "settings",
    label: "Settings",
    icon: "Settings",
    path: "/admin/settings",
    children: [
      { id: "settings-general", label: "General Settings", path: "/admin/settings" },
      { id: "settings-system", label: "System Health", path: "/admin/system", permission: ADMIN_PERMISSIONS.SYSTEM_SETTINGS },
    ],
  },
  {
    id: "audit",
    label: "Audit Logs",
    icon: "ClipboardList",
    path: "/admin/audit",
    permission: ADMIN_PERMISSIONS.AUDIT_READ,
  },
];
