/**
 * QR Snap - Report Helper Service
 */

export const reportService = {
  formatReason(reasonKey) {
    const map = {
      adult_content: "Adult Content",
      violence: "Violence / Graphic",
      harassment: "Harassment / Bullying",
      spam: "Spam / Misleading",
      copyright: "Copyright Infringement",
      privacy_violation: "Privacy Violation",
      illegal_content: "Illegal Content",
      impersonation: "Impersonation",
      other: "Other Policy Violation",
    };
    return map[reasonKey] || String(reasonKey || "General Abuse");
  },

  getPriorityBadgeColor(priority) {
    switch (priority) {
      case "critical":
        return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  },
};

export default reportService;
