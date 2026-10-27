import axios from "axios";

const api = axios.create({
  baseURL: "/api/branding",
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

export const brandingApi = {
  getBranding: async () => {
    const response = await api.get("/");
    return response.data;
  },

  updateBranding: async (data) => {
    const response = await api.patch("/", data);
    return response.data;
  },

  uploadLogo: async (formData) => {
    const response = await api.post("/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  uploadFavicon: async (formData) => {
    const response = await api.post("/favicon", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  verifyDomain: async (customDomain) => {
    const response = await api.post("/verify-domain", { customDomain });
    return response.data;
  },

  getDomainStatus: async () => {
    const response = await api.get("/domain-status");
    return response.data;
  },
};

export default brandingApi;
