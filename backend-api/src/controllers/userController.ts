import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { query } from "../config/db";

/**
 * Invite a teammate to a Bot Workspace
 */
export const inviteTeammate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { botId, email, role } = req.body;

    // 1. Verify Requesting User is the Bot Owner/Admin
    const botCheck = await query(
      "SELECT id FROM bots WHERE id = $1 AND user_id = $2",
      [botId, req.user!.id]
    );
    if (!botCheck.rows.length) return res.status(403).json({ error: "Unauthorized" });

    // 2. Find target user
    const userRes = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (!userRes.rows.length) return res.status(404).json({ error: "User not found. They must sign up first." });

    const targetUserId = userRes.rows[0].id;

    // 3. Create Assignment
    await query(
      `INSERT INTO bot_assignments (bot_id, user_id, role) 
       VALUES ($1, $2, $3) ON CONFLICT (bot_id, user_id) DO UPDATE SET role = $3`,
      [botId, targetUserId, role || 'agent']
    );

    res.json({ success: true, message: "Teammate added successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Personal User Settings
 */
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const result = await query(
      "UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, role",
      [name, req.user!.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};