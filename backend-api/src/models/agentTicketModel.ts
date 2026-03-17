// src/models/agentTicketModel.ts

import { query } from "../config/db";

export async function createTicket(
  conversationId: string,
  status: string
) {
  const res = await query(
    `
    INSERT INTO agent_tickets
    (conversation_id, status)
    VALUES ($1,$2)
    RETURNING *
    `,
    [conversationId, status]
  );

  return res.rows[0];
}

export async function findTicketById(
  id: string
) {
  const res = await query(
    `
    SELECT *
    FROM agent_tickets
    WHERE id = $1
    `,
    [id]
  );

  return res.rows[0];
}

export async function findTicketsByBot(
  botId: string
) {
  const res = await query(
    `
    SELECT t.*
    FROM agent_tickets t
    JOIN conversations c
    ON t.conversation_id = c.id
    WHERE c.bot_id = $1
    ORDER BY t.created_at DESC
    `,
    [botId]
  );

  return res.rows;
}

export async function updateTicketStatus(
  id: string,
  status: string
) {
  const res = await query(
    `
    UPDATE agent_tickets
    SET status = $1
    WHERE id = $2
    RETURNING *
    `,
    [status, id]
  );

  return res.rows[0];
}