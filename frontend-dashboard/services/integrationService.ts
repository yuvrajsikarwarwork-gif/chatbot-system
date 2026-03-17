import apiClient from "./apiClient";

export const integrationService = {
  getAll: async (botId: string) => {
    const res = await apiClient.get("/integrations", {
      params: { botId },
    });
    return res.data;
  },

  save: async (botId: string, channel: string, config: Record<string, any>) => {
    const res = await apiClient.post("/integrations", {
      botId,
      channel,
      config,
    });
    return res.data;
  },
};