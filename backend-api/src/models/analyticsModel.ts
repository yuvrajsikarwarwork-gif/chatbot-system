// src/models/analyticsModel.ts

import { query } from "../config/db";

export async function countMessagesByBot(
  botId: string
) {
  const res = await query(
    `
    SELECT COUNT(*) FROM messages m
    JOIN conversations c
    ON m.conversation_id = c.id
    WHERE c.bot_id = $1
    `,
    [botId]
  );

  return Number(res.rows[0].count);
}

export async function countConversationsByBot(
  botId: string
) {
  const res = await query(
    `
    SELECT COUNT(*) FROM conversations
    WHERE bot_id = $1
    `,
    [botId]
  );

  return Number(res.rows[0].count);
}

export async function getEventsByBot(
  botId: string
) {
  const res = await query(
    `
    SELECT *
    FROM analytics_events
    WHERE bot_id = $1
    ORDER BY created_at DESC
    LIMIT 100
    `,
    [botId]
  );

  return res.rows;
}