// frontend-dashboard/services/flowService.ts

import apiClient from "./apiClient";

export interface FlowData {
  nodes: any[];
  edges: any[];
}

/**
 * Frontend Flow Service
 * Communicates with the backend API. Direct database models are NOT imported here.
 */
export const flowService = {
  /**
   * Fetches the flow for a specific bot.
   * Path matches backend: /api/flows/bot/:botId
   */
  getFlow: async (botId: string) => {
    try {
      // Adjusted to match the backend route mapping app.use("/api/flows", flowRoutes)
      // and the controller getFlowsByBot which expects /bot/:botId
      const res = await apiClient.get(`/flows/bot/${botId}`);
      
      // Ensure we return the standardized structure even if the backend returns a raw row
      const data = res.data;
      return {
        nodes: data?.nodes || [],
        edges: data?.edges || []
      };
    } catch (err: any) {
      console.error("flowService.getFlow Error:", err);
      // Return empty structure on 404 or error to prevent canvas crash
      return { nodes: [], edges: [] };
    }
  },

  /**
   * Saves the current flow state.
   * Path matches backend: /api/flows/save
   */
  saveFlow: async (botId: string, flow: FlowData) => {
    try {
      const res = await apiClient.post("/flows/save", {
        botId,
        flow_json: {
          nodes: flow.nodes,
          edges: flow.edges
        }
      });
      return res.data;
    } catch (err: any) {
      console.error("flowService.saveFlow Error:", err);
      throw err;
    }
  },

  /**
   * Deletes a flow by ID.
   */
  deleteFlow: async (id: string) => {
    const res = await apiClient.delete(`/flows/${id}`);
    return res.data;
  }
};