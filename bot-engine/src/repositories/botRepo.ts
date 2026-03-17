import { query } from "../adapters/dbAdapter";

export const getBotById = async (id: string) => {
  const rows = await query(
    "SELECT * FROM bots WHERE id = $1",
    [id]
  );

  return rows[0];
};