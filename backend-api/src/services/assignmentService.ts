import { query } from "../config/db";

export const assignUserToBot = async (botId: string, email: string, role: string) => {
  // 1. Find user by email
  const userRes = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (userRes.rowCount === 0) throw new Error("User not found. They must register first.");
  
  const userId = userRes.rows[0].id;

  // 2. Create assignment
  await query(
    `INSERT INTO bot_assignments (bot_id, user_id, assigned_role) 
     VALUES ($1, $2, $3) ON CONFLICT (bot_id, user_id) DO UPDATE SET assigned_role = $3`,
    [botId, userId, role]
  );
  
  return { success: true };
};