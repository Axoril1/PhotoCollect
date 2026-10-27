import axios from "axios";

const api = axios.create({
  baseURL: "/api/growth",
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

export const growthApi = {
  getWallet: async () => {
    const response = await api.get("/wallet");
    return response.data;
  },

  getReferrals: async () => {
    const response = await api.get("/referrals");
    return response.data;
  },

  redeemCoupon: async (code) => {
    const response = await api.post("/redeem", { code });
    return response.data;
  },

  getAffiliate: async () => {
    const response = await api.get("/affiliate");
    return response.data;
  },

  getCampaigns: async () => {
    const response = await api.get("/campaigns");
    return response.data;
  },

  giftSubscription: async (data) => {
    const response = await api.post("/gift", data);
    return response.data;
  },
};

export default growthApi;
