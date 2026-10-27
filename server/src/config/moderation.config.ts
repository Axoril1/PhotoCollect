export interface ModerationConfig {
  enableGoogleModeration: boolean;
  enableNsfwjs: boolean;
  autoApproveThreshold: number;
  manualReviewThreshold: number;
  autoRejectThreshold: number;
}

export const moderationConfig: ModerationConfig = {
  enableGoogleModeration: process.env.ENABLE_GOOGLE_MODERATION !== 'false',
  enableNsfwjs: process.env.ENABLE_NSFWJS === 'true',
  autoApproveThreshold: parseFloat(process.env.AUTO_APPROVE_THRESHOLD || '0.3'),
  manualReviewThreshold: parseFloat(process.env.MANUAL_REVIEW_THRESHOLD || '0.5'),
  autoRejectThreshold: parseFloat(process.env.AUTO_REJECT_THRESHOLD || '0.8'),
};

// Self-heal and normalize threshold boundaries
if (isNaN(moderationConfig.autoApproveThreshold) || moderationConfig.autoApproveThreshold < 0 || moderationConfig.autoApproveThreshold > 1) {
  moderationConfig.autoApproveThreshold = 0.3;
}
if (isNaN(moderationConfig.manualReviewThreshold) || moderationConfig.manualReviewThreshold < 0 || moderationConfig.manualReviewThreshold > 1) {
  moderationConfig.manualReviewThreshold = 0.5;
}
if (isNaN(moderationConfig.autoRejectThreshold) || moderationConfig.autoRejectThreshold < 0 || moderationConfig.autoRejectThreshold > 1) {
  moderationConfig.autoRejectThreshold = 0.8;
}

// Ensure thresholds follow logical precedence: approve <= manual <= reject
if (moderationConfig.autoApproveThreshold > moderationConfig.manualReviewThreshold) {
  moderationConfig.manualReviewThreshold = moderationConfig.autoApproveThreshold;
}
if (moderationConfig.manualReviewThreshold > moderationConfig.autoRejectThreshold) {
  moderationConfig.autoRejectThreshold = moderationConfig.manualReviewThreshold;
}

export default moderationConfig;
