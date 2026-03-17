// src/models/conversationModel.ts

import { query } from "../config/db";

export async function findConversation(
  botId: string,
  channel: string,
  externalId: string
) {
  const res = await query(
    `
    SELECT * FROM conversations
    WHERE bot_id = $1
    AND channel = $2
    AND user_identifier = $3
    `,
    [botId, channel, externalId]
  );

  return res.rows[0];
}

export async function createConversation(
  botId: string,
  channel: string,
  externalId: string
) {
  const res = await query(
    `
    INSERT INTO conversations
    (bot_id, channel, user_identifier)
    VALUES ($1,$2,$3)
    RETURNING *
    `,
    [botId, channel, externalId]
  );

  return res.rows[0];
}

// add below existing code

export async function findConversationsByBot(
  botId: string
) {
  const res = await query(
    `
    SELECT *
    FROM conversations
    WHERE bot_id = $1
    ORDER BY created_at DESC
    `,
    [botId]
  );

  return res.rows;
}

export async function findConversationById(
  id: string
) {
  const res = await query(
    `
    SELECT *
    FROM conversations
    WHERE id = $1
    `,
    [id]
  );

  return res.rows[0];
}

export async function findMessagesForConversation(
  conversationId: string
) {
  const res = await query(
    `
    SELECT *
    FROM messages
    WHERE conversation_id = $1
    ORDER BY created_at ASC
    `,
    [conversationId]
  );

  return res.rows;
}