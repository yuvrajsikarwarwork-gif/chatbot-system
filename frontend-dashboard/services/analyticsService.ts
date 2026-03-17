import apiClient from "./apiClient";

export const analyticsService = {
  getStats: async (botId: string) => {
    const res = await apiClient.get("/analytics", {
      params: { botId },
    });

    return res.data;
  },
};