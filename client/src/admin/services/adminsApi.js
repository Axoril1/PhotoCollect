import axios from "axios";

const api = axios.create({
  baseURL: "/api/admin/admins-center",
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

export const adminsApi = {
  getAdmins: async (params = {}) => {
    const response = await api.get("/admins", { params });
    return response.data;
  },

  createAdmin: async (data) => {
    const response = await api.post("/admins", data);
    return response.data;
  },

  updateRole: async (id, role) => {
    const response = await api.patch(`/admins/${id}/role`, { role });
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/admins/${id}/status`, { status });
    return response.data;
  },

  updatePermissions: async (id, permissions) => {
    const response = await api.patch(`/admins/${id}/permissions`, { permissions });
    return response.data;
  },

  deleteAdmin: async (id) => {
    const response = await api.delete(`/admins/${id}`);
    return response.data;
  },

  getActivity: async (id, params = {}) => {
    const response = await api.get(`/admins/${id}/activity`, { params });
    return response.data;
  },

  getSessions: async (id) => {
    const response = await api.get(`/admins/${id}/sessions`);
    return response.data;
  },

  revokeSession: async (id, sessionId) => {
    const response = await api.delete(`/admins/${id}/sessions/${sessionId}`);
    return response.data;
  },
};

export default adminsApi;
