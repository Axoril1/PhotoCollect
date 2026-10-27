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

export const usersApi = {
  /**
   * Fetch paginated list of users with search, role, status, plan & verification filters
   */
  getUsers: async (params = {}) => {
    const response = await api.get("/", { params });
    return response.data;
  },

  /**
   * Fetch complete user profile by ID with storage & activity stats
   */
  getUserById: async (id) => {
    const response = await api.get(`/${id}`);
    return response.data;
  },

  /**
   * Update user profile or role
   */
  updateUser: async (id, updateData) => {
    const response = await api.patch(`/${id}`, updateData);
    return response.data;
  },

  /**
   * Change user account status (active, suspended, pending, deleted, banned)
   */
  updateStatus: async (id, status) => {
    const response = await api.patch(`/${id}/status`, { status });
    return response.data;
  },

  /**
   * Permanent account deletion (SUPER_ADMIN only)
   */
  deleteUser: async (id) => {
    const response = await api.delete(`/${id}`);
    return response.data;
  },

  /**
   * Terminate active user sessions
   */
  terminateSessions: async (id) => {
    const response = await api.delete(`/${id}/sessions`);
    return response.data;
  },

  /**
   * Internal Admin Notes API
   */
  getNotes: async (id) => {
    const response = await api.get(`/${id}/notes`);
    return response.data;
  },

  addNote: async (id, content) => {
    const response = await api.post(`/${id}/notes`, { content });
    return response.data;
  },
};

export default usersApi;
