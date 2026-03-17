import apiClient from "./apiClient";

export interface Conversation {
  id: string;
  bot_id: string;
  user_identifier: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: string;
  message: string;
  isBot?: boolean; // Added to distinguish bubbles
}

export const messageService = {
  getConversations: async (botId: string): Promise<Conversation[]> => {
    const res = await apiClient.get("/conversations", {
      params: { botId },
    });
    return res.data;
  },

  getMessages: async (conversationId: string): Promise<Message[]> => {
    const res = await apiClient.get("/messages", {
      params: { conversationId },
    });
    return res.data;
  },

  // NEW: Send function for WhatsApp
  sendWhatsApp: async (to: string, text: string) => {
    const res = await apiClient.post("/send-message", { to, text });
    return res.data;
  }
};