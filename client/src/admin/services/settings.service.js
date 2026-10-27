/**
 * QR Snap - Platform Settings Helper Service
 */

export const settingsService = {
  formatSectionTitle(sectionKey) {
    const map = {
      general: "General Settings",
      uploads: "Upload Limits & Compression",
      moderation: "AI Content Moderation",
      storage: "Cloudflare R2 & Local Storage",
      authentication: "Auth & Identity Governance",
      email: "Email Infrastructure & SMTP",
      integrations: "Platform Integrations Status",
      security: "Security Policy & Rate Limits",
      branding: "Platform Branding & UI Tokens",
      feature_flags: "Feature Flags & Staged Rollout",
      maintenance: "Maintenance Mode Controls",
    };
    return map[sectionKey] || "Settings Section";
  },
};

export default settingsService;
