import axios from "axios";

const api = axios.create({
  baseURL: "/api/notifications",
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

export const notificationApi = {
  getNotifications: async (params = {}) => {
    const response = await api.get("/", { params });
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await api.patch(`/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch("/read-all");
    return response.data;
  },

  getPreferences: async () => {
    const response = await api.get("/preferences");
    return response.data;
  },

  updatePreferences: async (data) => {
    const response = await api.patch("/preferences", data);
    return response.data;
  },
};

export default notificationApi;
