// frontend-dashboard/services/flowService.ts

import apiClient from "./apiClient";

// Group the methods into the exact object expected by pages/flows.tsx
export const flowService = {
  getFlow: async (botId: string) => {
    try {
      const response = await apiClient.get(`/flows/${botId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching flow:", error);
      throw error;
    }
  },

  saveFlow: async (botId: string, flowData: any) => {
    try {
      const response = await apiClient.post(`/flows`, { 
        bot_id: botId, 
        flow_json: flowData 
      });
      return response.data;
    } catch (error) {
      console.error("Error saving flow:", error);
      throw error;
    }
  }
};

// Also export them individually just in case other components use the named exports
export const getFlow = flowService.getFlow;
export const saveFlow = flowService.saveFlow;