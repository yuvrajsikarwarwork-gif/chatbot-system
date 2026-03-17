// worker/src/stateRepo.ts

import { query } from "../adapters/dbAdapter";


export const getState = async (
  conversationId: string
) => {
  const res = await query(
    `
    SELECT *
    FROM conversation_state
    WHERE conversation_id = $1
    LIMIT 1
    `,
    [conversationId]
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