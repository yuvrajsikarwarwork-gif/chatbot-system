import { query } from "../config/db";

export async function getMessagesService(botId: string) {
  const result = await query(
    "SELECT * FROM messages WHERE bot_id = $1 ORDER BY created_at ASC",
    [botId]
  );
  return result.rows;
}

export async function saveMessageService(botId: string, role: string, content: string) {
  const result = await query(
    "INSERT INTO messages (bot_id, role, content) VALUES ($1, $2, $3) RETURNING *",
    [botId, role, content]
  );
  return result.rows[0];
}