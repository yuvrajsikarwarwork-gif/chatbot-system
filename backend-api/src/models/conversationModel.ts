// src/models/conversationModel.ts

import { query } from "../config/db";

export async function findConversation(
  botId: string,
  channel: string,
  externalId: string
) {
  const res = await query(
    `
    SELECT c.*
    FROM conversations c
    JOIN contacts ct ON c.contact_id = ct.id
    WHERE c.bot_id = $1
      AND c.channel = $2
      AND ct.platform_user_id = $3
    `,
    [botId, channel, externalId]
  );

  return res.rows[0];
}

export async function createConversation(
  botId: string,
  channel: string,
  externalId: string,
  contactName = "User"
) {
  const contactRes = await query(
    `
    INSERT INTO contacts (bot_id, platform_user_id, name)
    VALUES ($1, $2, $3)
    ON CONFLICT (bot_id, platform_user_id)
    DO UPDATE SET name = COALESCE(contacts.name, EXCLUDED.name)
    RETURNING *
    `,
    [botId, externalId, contactName]
  );

  const contact = contactRes.rows[0];

  const res = await query(
    `
    INSERT INTO conversations
    (bot_id, contact_id, channel, status, variables)
    VALUES ($1, $2, $3, 'active', '{}'::jsonb)
    ON CONFLICT (contact_id, channel)
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [botId, contact.id, channel]
  );

  return res.rows[0];
}

// add below existing code

export async function findConversationsByBot(
  botId: string
) {
  const res = await query(
    `
    SELECT c.*, ct.name AS display_name, ct.platform_user_id AS external_id
    FROM conversations c
    JOIN contacts ct ON c.contact_id = ct.id
    WHERE c.bot_id = $1
    ORDER BY c.created_at DESC
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
    SELECT c.*, ct.name AS display_name, ct.platform_user_id AS external_id
    FROM conversations c
    JOIN contacts ct ON c.contact_id = ct.id
    WHERE c.id = $1
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
