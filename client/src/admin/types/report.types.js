/**
 * QR Snap - Reports & Abuse Management Types & Constants
 */

export const REPORT_TYPES = {
  PHOTO: "photo",
  EVENT: "event",
  USER: "user",
  ORGANIZER: "organizer",
};

export const REPORT_REASONS = {
  ADULT_CONTENT: "adult_content",
  VIOLENCE: "violence",
  HARASSMENT: "harassment",
  SPAM: "spam",
  COPYRIGHT: "copyright",
  PRIVACY_VIOLATION: "privacy_violation",
  ILLEGAL_CONTENT: "illegal_content",
  IMPERSONATION: "impersonation",
  OTHER: "other",
};

export const REPORT_STATUSES = {
  PENDING: "pending",
  INVESTIGATING: "investigating",
  RESOLVED: "resolved",
  DISMISSED: "dismissed",
};

export const REPORT_PRIORITIES = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};
