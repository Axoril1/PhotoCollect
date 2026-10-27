import adminApi from "./adminApi.js";

export const webhooksApi = {
  getWebhooks: async (params = {}) => {
    const response = await adminApi.get("/subscriptions-center/webhooks", { params });
    return response.data;
  },

  getWebhookMetrics: async () => {
    const response = await adminApi.get("/subscriptions-center/webhooks/metrics");
    return response.data;
  },

  replayWebhook: async (eventId) => {
    const response = await adminApi.post(`/subscriptions-center/webhooks/${eventId}/replay`);
    return response.data;
  },
};

export default webhooksApi;
