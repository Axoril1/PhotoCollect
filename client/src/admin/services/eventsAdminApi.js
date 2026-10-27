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

export const eventsAdminApi = {
  /**
   * Fetch server-side paginated events queue with search & filters
   */
  getEvents: async (params = {}) => {
    const response = await api.get("/", { params });
    return response.data;
  },

  /**
   * Update event details
   */
  updateEvent: async (id, payload) => {
    const response = await api.patch(`/${id}`, payload);
    return response.data;
  },

  /**
   * Archive event
   */
  archiveEvent: async (id) => {
    const response = await api.post(`/${id}/archive`);
    return response.data;
  },

  /**
   * Restore event
   */
  restoreEvent: async (id) => {
    const response = await api.post(`/${id}/restore`);
    return response.data;
  },

  /**
   * Disable event access
   */
  disableEvent: async (id) => {
    const response = await api.post(`/${id}/disable`);
    return response.data;
  },

  /**
   * Transfer event ownership to another organizer
   */
  transferOwnership: async (id, newOwnerId) => {
    const response = await api.post(`/${id}/transfer`, { newOwnerId });
    return response.data;
  },

  /**
   * Delete event permanently (Super Admin only)
   */
  deleteEvent: async (id) => {
    const response = await api.delete(`/${id}`);
    return response.data;
  },
};

export default eventsAdminApi;
