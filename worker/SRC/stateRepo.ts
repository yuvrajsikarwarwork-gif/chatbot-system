// worker/src/stateRepo.ts

import { query } from "../adapters/dbAdapter";


export const getState = async (
  botId: string, // ✅ Added tenant scope
  conversationId: string
) => {
  // ✅ DB-level verification: JOIN ensures the state belongs to the bot tenant
  const res = await query(
    `
    SELECT s.*
    FROM conversation_state s
    JOIN conversations c ON s.conversation_id = c.id
    WHERE s.conversation_id = $1 AND c.bot_id = $2
    LIMIT 1
    `,
    [conversationId, botId]
  );

  return res.rows[0] || null;
};


export const createState = async (
  conversationId: string,
  state: any
) => {
  await query(
    `
    INSERT INTO conversation_state (
      conversation_id,
      state_json,
      updated_at
    )
    VALUES ($1, $2, NOW())
    `,
    [
      conversationId,
      JSON.stringify(state),
    ]
  );
};


export const updateState = async (
  conversationId: string,
  state: any
) => {
  await query(
    `
    UPDATE conversation_state
    SET
      state_json = $1,
      updated_at = NOW()
    WHERE conversation_id = $2
    `,
    [
      JSON.stringify(state),
      conversationId,
    ]
  );
};