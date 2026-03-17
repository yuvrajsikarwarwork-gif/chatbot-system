// worker/src/analyticsRepo.ts

import { query } from "../adapters/dbAdapter";


export const logEvent = async (
  event: {
    botId?: string;
    conversationId?: string;
    type: string;
    data?: any;
  }
) => {
  await query(
    `
    INSERT INTO analytics_events (
      bot_id,
      conversation_id,
      event_type,
      data_json,
      created_at
    )
    VALUES ($1, $2, $3, $4, NOW())
    `,
    [
      event.botId || null,
      event.conversationId || null,
      event.type,
      event.data
        ? JSON.stringify(event.data)
        : null,
    ]
  );
};


export const logError = async (
  jobId: string,
  error: any
) => {
  await query(
    `
    INSERT INTO analytics_events (
      event_type,
      data_json,
      created_at
    )
    VALUES ($1, $2, NOW())
    `,
    [
      "worker_error",
      JSON.stringify({
        jobId,
        message:
          error?.message ||
          "unknown error",
      }),
    ]
  );
};