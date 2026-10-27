/**
 * QR Snap - Subscription Helper Service
 */

export const subscriptionService = {
  formatStatus(status) {
    const map = {
      TRIAL: "Trial Period",
      ACTIVE: "Active",
      PAST_DUE: "Past Due",
      CANCELED: "Canceled",
      EXPIRED: "Expired",
      SUSPENDED: "Suspended",
    };
    return map[status] || status;
  },

  getStatusBadgeClass(status) {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "TRIAL":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "PAST_DUE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "CANCELED":
      case "EXPIRED":
        return "bg-slate-800 text-slate-400 border-slate-700";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  },
};

export default subscriptionService;
