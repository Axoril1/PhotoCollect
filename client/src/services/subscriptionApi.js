import axios from "axios";

const api = axios.create({
  baseURL: "/api/subscriptions-plans",
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

export const subscriptionApi = {
  /**
   * Fetch public available plans
   */
  getPlans: async () => {
    const response = await api.get("/plans");
    return response.data;
  },

  /**
   * Fetch current user's active subscription
   */
  getSubscription: async () => {
    const response = await api.get("/subscription");
    return response.data;
  },

  /**
   * Fetch current user's usage & quota limits
   */
  getUsage: async () => {
    const response = await api.get("/subscription/usage");
    return response.data;
  },

  /**
   * Self-upgrade plan
   */
  upgradePlan: async (planSlug) => {
    const response = await api.post("/subscription/upgrade", { planSlug });
    return response.data;
  },

  /**
   * Self-downgrade plan
   */
  downgradePlan: async (planSlug) => {
    const response = await api.post("/subscription/downgrade", { planSlug });
    return response.data;
  },

  /**
   * Cancel subscription
   */
  cancelSubscription: async () => {
    const response = await api.post("/subscription/cancel");
    return response.data;
  },
};

export default subscriptionApi;
