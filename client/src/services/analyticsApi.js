import axios from "axios";

const api = axios.create({
  baseURL: "/api/analytics",
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

export const analyticsApi = {
  getOverview: async (params = {}) => {
    const response = await api.get("/overview", { params });
    return response.data;
  },

  getEvents: async () => {
    const response = await api.get("/events");
    return response.data;
  },

  getStorage: async () => {
    const response = await api.get("/storage");
    return response.data;
  },

  getUploads: async () => {
    const response = await api.get("/uploads");
    return response.data;
  },

  getQR: async () => {
    const response = await api.get("/qr");
    return response.data;
  },

  getAI: async () => {
    const response = await api.get("/ai");
    return response.data;
  },

  exportCSVUrl: "/api/analytics/export",
};

export default analyticsApi;
