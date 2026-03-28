// src/models/analyticsModel.ts

import { query } from "../config/db";

export async function countMessagesByBot(
  botId: string
) {
  const res = await query(
    `
    SELECT COUNT(*)
    FROM messages m
    JOIN conversations c
      ON m.conversation_id = c.id
    JOIN bots b
      ON c.bot_id = b.id
    LEFT JOIN workspaces w
      ON b.workspace_id = w.id
    WHERE c.bot_id = $1
      AND c.deleted_at IS NULL
      AND b.deleted_at IS NULL
      AND (w.id IS NULL OR w.deleted_at IS NULL)
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
    SELECT COUNT(*)
    FROM conversations c
    JOIN bots b
      ON c.bot_id = b.id
    LEFT JOIN workspaces w
      ON b.workspace_id = w.id
    WHERE c.bot_id = $1
      AND c.deleted_at IS NULL
      AND b.deleted_at IS NULL
      AND (w.id IS NULL OR w.deleted_at IS NULL)
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
    SELECT ae.*
    FROM analytics_events ae
    JOIN bots b
      ON ae.bot_id = b.id
    LEFT JOIN workspaces w
      ON b.workspace_id = w.id
    WHERE ae.bot_id = $1
      AND b.deleted_at IS NULL
      AND (w.id IS NULL OR w.deleted_at IS NULL)
      AND (
        ae.conversation_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM conversations c
          WHERE c.id = ae.conversation_id
            AND c.deleted_at IS NULL
        )
      )
    ORDER BY created_at DESC
    LIMIT 100
    `,
    [botId]
  );

  return res.rows;
}
