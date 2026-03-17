import apiClient from "./apiClient";

export interface QueueJob {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload: any;
  attempts: number;
  created_at: string;
}

export const queueService = {
  getJobs: async (): Promise<QueueJob[]> => {
    const res = await apiClient.get("/queue/jobs");
    return res.data;
  },

  retryJob: async (jobId: string) => {
    return await apiClient.post(`/queue/jobs/${jobId}/retry`);
  }
};