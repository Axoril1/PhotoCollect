/**
 * QR Snap - AI Moderation Helper Service
 */

import moderationApi from "./moderationApi.js";

export const moderationService = {
  formatLikelihood(val) {
    if (typeof val === "number") {
      const map = { 1: "Very Unlikely", 2: "Unlikely", 3: "Possible", 4: "Likely", 5: "Very Likely" };
      return map[val] || "Unknown";
    }
    return String(val || "Unknown");
  },

  getLikelihoodColor(val) {
    const text = this.formatLikelihood(val).toLowerCase();
    if (text.includes("very likely") || text.includes("likely")) return "text-rose-400 font-bold";
    if (text.includes("possible")) return "text-amber-400 font-semibold";
    return "text-emerald-400 font-medium";
  },
};

export default moderationService;
