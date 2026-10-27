import axios from "axios";

const api = axios.create({
  baseURL: "/api/admin/moderation",
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

export const moderationApi = {
  /**
   * Fetch server-side paginated moderation queue
   */
  getQueue: async (params = {}) => {
    const response = await api.get("/queue", { params });
    return response.data;
  },

  /**
   * Fetch complete photo inspection record (AI scores, EXIF, uploader, event)
   */
  getPhotoDetail: async (photoId) => {
    const response = await api.get(`/photo/${photoId}`);
    return response.data;
  },

  /**
   * Approve photo
   */
  approvePhoto: async (photoId, payload = {}) => {
    const response = await api.patch(`/photo/${photoId}/approve`, payload);
    return response.data;
  },

  /**
   * Reject photo with reason
   */
  rejectPhoto: async (photoId, payload = {}) => {
    const response = await api.patch(`/photo/${photoId}/reject`, payload);
    return response.data;
  },

  /**
   * Delete photo permanently
   */
  deletePhoto: async (photoId) => {
    const response = await api.delete(`/photo/${photoId}`);
    return response.data;
  },

  /**
   * Execute bulk actions (bulk approve, reject, or delete)
   */
  executeBulkAction: async (photoIds, action, reason = "") => {
    const response = await api.post("/bulk-action", { photoIds, action, reason });
    return response.data;
  },

  /**
   * Fetch moderation audit trail history
   */
  getHistory: async (params = {}) => {
    const response = await api.get("/history", { params });
    return response.data;
  },

  /**
   * Fetch moderation analytics & statistics
   */
  getAnalytics: async () => {
    const response = await api.get("/analytics");
    return response.data;
  },

  /**
   * Fetch & post admin moderation notes
   */
  getComments: async (photoId) => {
    const response = await api.get(`/photo/${photoId}/comments`);
    return response.data;
  },

  addComment: async (photoId, content) => {
    const response = await api.post(`/photo/${photoId}/comments`, { content });
    return response.data;
  },
};

export default moderationApi;
