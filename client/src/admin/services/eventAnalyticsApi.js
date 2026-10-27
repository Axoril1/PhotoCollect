import axios from "axios";

const api = axios.create({
  baseURL: "/api/admin/events-management",
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

export const eventAnalyticsApi = {
  /**
   * Fetch event analytics for charts (hourly uploads, guest activity, storage growth, moderation trend, cost estimations)
   */
  getEventAnalytics: async (id) => {
    const response = await api.get(`/${id}/analytics`);
    return response.data;
  },
};

export default eventAnalyticsApi;
