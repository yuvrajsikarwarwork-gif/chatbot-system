import { query } from "../adapters/dbAdapter";

export const getConversationById = async (id: string) => {
  const rows = await query(
    "SELECT * FROM conversations WHERE id = $1",
    [id]
  );

  return rows[0];
};