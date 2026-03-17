import { query } from "../adapters/dbAdapter";

export const getMessageById = async (id: string) => {
  const rows = await query(
    "SELECT * FROM messages WHERE id = $1",
    [id]
  );

  return rows[0];
};