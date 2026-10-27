/**
 * QR Snap - Platform Dashboard Orchestration Service
 *
 * Handles data aggregation, fallback state resolution, and status normalization.
 */

import dashboardApi from "./dashboardApi.js";
import { SERVICE_STATUS } from "../types/dashboard.types.js";

export class DashboardService {
  /**
   * Fetches all dashboard widget data concurrently with resilient error isolation per widget.
   */
  async loadDashboardData() {
    const results = await Promise.allSettled([
      dashboardApi.getSummaryMetrics(),
      dashboardApi.getSystemStatus(),
      dashboardApi.getAIModerationSummary(),
      dashboardApi.getStorageSummary(),
      dashboardApi.getRecentActivity(),
    ]);

    const [metricsResult, statusResult, moderationResult, storageResult, activityResult] = results;

    return {
      metrics: metricsResult.status === "fulfilled" ? metricsResult.value.metrics : null,
      systemStatus: statusResult.status === "fulfilled" ? statusResult.value.services : [],
      moderation: moderationResult.status === "fulfilled" ? moderationResult.value.moderation : null,
      storage: storageResult.status === "fulfilled" ? storageResult.value.storage : null,
      activity: activityResult.status === "fulfilled" ? activityResult.value.activities : [],
      errors: {
        metrics: metricsResult.status === "rejected" ? metricsResult.reason : null,
        systemStatus: statusResult.status === "rejected" ? statusResult.reason : null,
        moderation: moderationResult.status === "rejected" ? moderationResult.reason : null,
        storage: storageResult.status === "rejected" ? storageResult.reason : null,
        activity: activityResult.status === "rejected" ? activityResult.reason : null,
      },
    };
  }

  /**
   * Normalizes a service health status string into a safe SERVICE_STATUS enum value.
   */
  normalizeStatus(statusStr) {
    if (!statusStr) return SERVICE_STATUS.UNKNOWN;
    const lower = String(statusStr).toLowerCase();
    if (lower === "healthy" || lower === "online" || lower === "ok") return SERVICE_STATUS.HEALTHY;
    if (lower === "warning" || lower === "degraded") return SERVICE_STATUS.WARNING;
    if (lower === "offline" || lower === "error" || lower === "failed") return SERVICE_STATUS.OFFLINE;
    return SERVICE_STATUS.UNKNOWN;
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
