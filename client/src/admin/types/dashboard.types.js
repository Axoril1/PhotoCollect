/**
 * QR Snap - Platform Dashboard Types & Status Enums
 */

export const SERVICE_STATUS = {
  HEALTHY: "healthy",
  WARNING: "warning",
  OFFLINE: "offline",
  UNKNOWN: "unknown",
};

export const METRIC_TREND = {
  INCREASE: "increase",
  DECREASE: "decrease",
  NEUTRAL: "neutral",
};

export const ACTIVITY_TYPES = {
  USER_REGISTERED: "USER_REGISTERED",
  EVENT_CREATED: "EVENT_CREATED",
  IMAGE_UPLOADED: "IMAGE_UPLOADED",
  IMAGE_REJECTED: "IMAGE_REJECTED",
  ADMIN_APPROVED: "ADMIN_APPROVED",
  STORAGE_INCREASED: "STORAGE_INCREASED",
  SYSTEM_RESTARTED: "SYSTEM_RESTARTED",
};
