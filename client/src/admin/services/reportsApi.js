import axios from "axios";

const api = axios.create({
  baseURL: "/api/admin/reports",
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

export const reportsApi = {
  /**
   * Fetch server-side paginated report queue
   */
  getReports: async (params = {}) => {
    const response = await api.get("/", { params });
    return response.data;
  },

  /**
   * Fetch single report detail & target item preview
   */
  getReportDetail: async (reportId) => {
    const response = await api.get(`/${reportId}`);
    return response.data;
  },

  /**
   * Assign report to moderator
   */
  assignModerator: async (reportId) => {
    const response = await api.patch(`/${reportId}/assign`);
    return response.data;
  },

  /**
   * Resolve report
   */
  resolveReport: async (reportId, payload = {}) => {
    const response = await api.patch(`/${reportId}/resolve`, payload);
    return response.data;
  },

  /**
   * Dismiss report
   */
  dismissReport: async (reportId, reason = "") => {
    const response = await api.patch(`/${reportId}/dismiss`, { reason });
    return response.data;
  },

  /**
   * Fetch resolution history feed
   */
  getHistory: async () => {
    const response = await api.get("/history/list");
    return response.data;
  },

  /**
   * Fetch abuse analytics statistics
   */
  getStatistics: async () => {
    const response = await api.get("/statistics/summary");
    return response.data;
  },
};

export default reportsApi;
