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

export const eventDetailsApi = {
  /**
   * Fetch single event details with owner and stats
   */
  getEventDetail: async (id) => {
    const response = await api.get(`/${id}`);
    return response.data;
  },

  /**
   * Fetch activity timeline feed
   */
  getEventTimeline: async (id) => {
    const response = await api.get(`/${id}/timeline`);
    return response.data;
  },
};

export default eventDetailsApi;
