/**
 * QR Snap - AI Moderation Center Types & Constants
 */

export const MODERATION_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  AUTO_APPROVED: "auto_approved",
  AUTO_REJECTED: "auto_rejected",
};

export const MODERATION_PROVIDERS = {
  GOOGLE_VISION: "google_vision",
  NSFWJS: "nsfwjs",
  HYBRID: "hybrid",
  MANUAL: "manual",
};

export const GOOGLE_VISION_LIKELIHOODS = {
  VERY_UNLIKELY: 1,
  UNLIKELY: 2,
  POSSIBLE: 3,
  LIKELY: 4,
  VERY_LIKELY: 5,
};
