import apiClient from "./apiClient";

export const botService = {
  getBots: async () => {
    const res = await apiClient.get("/bots");
    return res.data;
  },

  createBot: async (
    name: string,
    wa_phone_number_id: string,
    wa_access_token: string,
    trigger_keywords: string
  ) => {
    const res = await apiClient.post("/bots", {
      name,
      wa_phone_number_id,
      wa_access_token,
      trigger_keywords,
    });

    return res.data;
  },

  activateBot: async (id: string) => {
    const res = await apiClient.post(`/bots/${id}/activate`);
    return res.data;
  },

  updateBot: async (
    id: string,
    botData: {
      name?: string;
      wa_phone_number_id?: string;
      wa_access_token?: string;
      trigger_keywords?: string;
    }
  ) => {
    const res = await apiClient.put(`/bots/${id}`, botData);
    return res.data;
  },

  deleteBot: async (id: string) => {
    const res = await apiClient.delete(`/bots/${id}`);
    return res.data;
  },
};