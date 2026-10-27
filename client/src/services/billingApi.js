import axios from "axios";

const api = axios.create({
  baseURL: "/api/billing",
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

export const billingApi = {
  /**
   * Create Stripe Checkout Session URL
   */
  createCheckoutSession: async ({ planSlug, interval = "monthly" }) => {
    const response = await api.post("/create-checkout-session", { planSlug, interval });
    return response.data;
  },

  /**
   * Create Stripe Billing Portal URL
   */
  createPortalSession: async () => {
    const response = await api.post("/create-portal-session");
    return response.data;
  },

  /**
   * Manually resync subscription status with Stripe
   */
  resyncSubscription: async () => {
    const response = await api.post("/resync-subscription");
    return response.data;
  },

  /**
   * Get current user's billing history
   */
  getBillingHistory: async () => {
    const response = await api.get("/history");
    return response.data;
  },
};

export default billingApi;
