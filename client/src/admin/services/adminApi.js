/**
 * QR Snap - Admin Application API Client Abstraction Layer
 *
 * Clean abstraction contracts for future API endpoints.
 * Endpoint handlers will connect to this abstraction layer.
 */

import axios from "axios";

const api = axios.create({
  baseURL: "/api/admin",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Attach Authorization Bearer header dynamically from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adminApi = {
  // Users Service Contract
  users: {
    getUsers: async (params = {}) => {
      // Future API call: return api.get("/users", { params });
      return Promise.resolve({ users: [], total: 0 });
    },
    getUserById: async (id) => {
      // Future API call: return api.get(`/users/${id}`);
      return Promise.resolve({ user: null });
    },
    suspendUser: async (id, suspend = true) => {
      // Future API call: return api.patch(`/users/${id}/suspend`, { suspend });
      return Promise.resolve({ success: true });
    },
    deleteUser: async (id) => {
      // Future API call: return api.delete(`/users/${id}`);
      return Promise.resolve({ success: true });
    },
  },

  // Events Service Contract
  events: {
    getEvents: async (params = {}) => {
      return Promise.resolve({ events: [], total: 0 });
    },
    getEventById: async (id) => {
      return Promise.resolve({ event: null });
    },
    deleteEvent: async (id) => {
      return Promise.resolve({ success: true });
    },
  },

  // Moderation Service Contract
  moderation: {
    getPendingQueue: async (params = {}) => {
      return Promise.resolve({ photos: [], total: 0 });
    },
    reviewPhoto: async (id, decision, reason = "") => {
      return Promise.resolve({ success: true });
    },
  },

  // Storage & Analytics Service Contract
  storage: {
    getStorageMetrics: async () => {
      return Promise.resolve({ totalUsageBytes: 0, provider: "cloudflare-r2" });
    },
  },

  analytics: {
    getPlatformMetrics: async (range = "30d") => {
      return Promise.resolve({ metrics: {} });
    },
  },

  // System & Audit Service Contract
  system: {
    getHealth: async () => {
      return Promise.resolve({ status: "healthy", timestamp: new Date().toISOString() });
    },
    getAuditLogs: async (params = {}) => {
      return Promise.resolve({ logs: [], total: 0 });
    },
    updateSettings: async (settings) => {
      return Promise.resolve({ success: true, settings });
    },
  },
};

export default adminApi;
