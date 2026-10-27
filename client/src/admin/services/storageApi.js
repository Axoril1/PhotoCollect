import axios from "axios";

const api = axios.create({
  baseURL: "/api/admin/storage",
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

export const storageApi = {
  /**
   * Fetch aggregated storage stats & provider distribution
   */
  getStats: async () => {
    const response = await api.get("/stats");
    return response.data;
  },

  /**
   * Fetch paginated list of stored files (File Explorer)
   */
  getFiles: async (params = {}) => {
    const response = await api.get("/files", { params });
    return response.data;
  },

  /**
   * Fetch single file details
   */
  getFileDetail: async (id) => {
    const response = await api.get(`/files/${id}`);
    return response.data;
  },

  /**
   * Delete file from storage
   */
  deleteFile: async (id) => {
    const response = await api.delete(`/files/${id}`);
    return response.data;
  },

  /**
   * Fetch paginated list of events by storage usage
   */
  getEventStorageList: async (params = {}) => {
    const response = await api.get("/events", { params });
    return response.data;
  },

  /**
   * Trigger storage cleanup utility (with optional dryRun)
   */
  runCleanup: async (dryRun = true) => {
    const response = await api.post("/cleanup", { dryRun });
    return response.data;
  },

  /**
   * Trigger storage object integrity verification
   */
  runVerify: async () => {
    const response = await api.post("/verify");
    return response.data;
  },
};

export default storageApi;
