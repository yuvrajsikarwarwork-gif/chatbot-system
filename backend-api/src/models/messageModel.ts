// src/models/messageModel.ts

import { query } from "../config/db";

export async function createMessage(
  conversationId: string,
  sender: string,
  text: string
) {
  const contextRes = await query(
    `
    SELECT c.bot_id, c.channel, ct.platform_user_id
    FROM conversations c
    JOIN contacts ct ON c.contact_id = ct.id
    WHERE c.id = $1
    `,
    [conversationId]
  );

  const context = contextRes.rows[0];
  if (!context) {
    throw new Error("Conversation not found");
  }

  const res = await query(
    `
    INSERT INTO messages
    (bot_id, conversation_id, channel, sender, platform_user_id, content)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    RETURNING *
    `,
    [
      context.bot_id,
      conversationId,
      context.channel,
      sender,
      context.platform_user_id,
      JSON.stringify({ type: "text", text }),
    ]
  );

  return res.rows[0];
}

export async function findMessagesByConversation(
  conversationId: string
) {
  const res = await query(
    `
    SELECT * FROM messages
    WHERE conversation_id = $1
    ORDER BY created_at ASC
    `,
    [conversationId]
  );

  return res.rows;
}
