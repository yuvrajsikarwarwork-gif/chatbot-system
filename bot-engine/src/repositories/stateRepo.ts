import { query } from "../adapters/dbAdapter";

export const getStateByConversationId = async (
  conversationId: string
) => {
  const rows = await query(
    "SELECT * FROM conversation_state WHERE conversation_id = $1",
    [conversationId]
  );

  return rows[0];
};