import { query } from "../config/db";

export interface ChatSession {
  id: string;
  bot_id: string;
  user_phone: string;
  current_node_id: string | null;
  session_data: any;
  updated_at: Date;
}

export const getOrCreateSession = async (
  botId: string, 
  userPhone: string, 
  defaultNodeId: string
): Promise<ChatSession> => {
  // Attempt to find existing session
  const res = await query(
    `SELECT * FROM chat_sessions WHERE bot_id = $1 AND user_phone = $2`,
    [botId, userPhone]
  );

  if (res.rows.length > 0) {
    return res.rows[0];
  }

  // Create new session if none exists
  const insertRes = await query(
    `INSERT INTO chat_sessions (bot_id, user_phone, current_node_id, session_data) 
     VALUES ($1, $2, $3, '{}') RETURNING *`,
    [botId, userPhone, defaultNodeId]
  );

  return insertRes.rows[0];
};

export const updateSessionNode = async (
  sessionId: string, 
  nextNodeId: string, 
  additionalData: any = {}
): Promise<void> => {
  await query(
    `UPDATE chat_sessions 
     SET current_node_id = $1, 
         session_data = session_data || $2::jsonb, 
         updated_at = NOW() 
     WHERE id = $3`,
    [nextNodeId, JSON.stringify(additionalData), sessionId]
  );
};

export const clearSession = async (sessionId: string): Promise<void> => {
  await query(`DELETE FROM chat_sessions WHERE id = $1`, [sessionId]);
};