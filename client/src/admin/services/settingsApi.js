import axios from "axios";

const api = axios.create({
  baseURL: "/api/admin/settings-center",
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

export const settingsApi = {
  /**
   * Fetch all platform configuration settings
   */
  getAllSettings: async () => {
    const response = await api.get("/");
    return response.data;
  },

  /**
   * Fetch settings for a specific section
   */
  getSectionSettings: async (section) => {
    const response = await api.get(`/${section}`);
    return response.data;
  },

  /**
   * Update section settings
   */
  updateSectionSettings: async (section, updates) => {
    const response = await api.patch(`/${section}`, updates);
    return response.data;
  },
};

export default settingsApi;
