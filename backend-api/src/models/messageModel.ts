// src/models/messageModel.ts

import { query } from "../config/db";

export async function createMessage(
  conversationId: string,
  sender: string,
  text: string
) {
  const res = await query(
    `
    INSERT INTO messages
    (conversation_id, sender, message)
    VALUES ($1,$2,$3)
    RETURNING *
    `,
    [conversationId, sender, text]
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