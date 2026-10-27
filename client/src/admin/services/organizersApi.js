import axios from "axios";

const api = axios.create({
  baseURL: "/api/admin/users",
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

export const organizersApi = {
  /**
   * Fetch paginated list of organizers with event count aggregations
   */
  getOrganizers: async (params = {}) => {
    const response = await api.get("/organizers/list", { params });
    return response.data;
  },

  /**
   * Fetch detailed organizer profile with gallery stats, QR metrics, and events
   */
  getOrganizerById: async (id) => {
    const response = await api.get(`/${id}`);
    return response.data;
  },
};

export default organizersApi;
