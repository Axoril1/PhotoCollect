/**
 * QR Snap - Platform Dashboard API Client Abstraction Layer
 *
 * Provides service contracts for platform metrics, system health checks, activity feeds,
 * moderation summaries, and chart data streams.
 */

import axios from "axios";

const api = axios.create({
  baseURL: "/api/admin/dashboard",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const dashboardApi = {
  /**
   * Fetches summary metrics (Users, Events, Images, Storage, API Requests)
   */
  getSummaryMetrics: async () => {
    // Future API endpoint: return (await api.get("/metrics")).data;
    return Promise.resolve({ metrics: null });
  },

  /**
   * Fetches live service health statuses (Database, R2, AI Vision, Sockets, etc.)
   */
  getSystemStatus: async () => {
    // Future API endpoint: return (await api.get("/system-status")).data;
    return Promise.resolve({ services: [] });
  },

  /**
   * Fetches AI Moderation engine performance and scan queue counts
   */
  getAIModerationSummary: async () => {
    // Future API endpoint: return (await api.get("/moderation-summary")).data;
    return Promise.resolve({ moderation: null });
  },

  /**
   * Fetches storage infrastructure metrics (Cloudflare R2 usage, bandwidth)
   */
  getStorageSummary: async () => {
    // Future API endpoint: return (await api.get("/storage-summary")).data;
    return Promise.resolve({ storage: null });
  },

  /**
   * Fetches recent platform activity timeline feed
   */
  getRecentActivity: async (limit = 10) => {
    // Future API endpoint: return (await api.get("/activity", { params: { limit } })).data;
    return Promise.resolve({ activities: [] });
  },

  /**
   * Fetches time-series chart data for uploads, user growth, and storage velocity
   */
  getChartData: async (metricKey, timeRange = "30d") => {
    // Future API endpoint: return (await api.get(`/charts/${metricKey}`, { params: { range: timeRange } })).data;
    return Promise.resolve({ series: null });
  },
};

export default dashboardApi;
