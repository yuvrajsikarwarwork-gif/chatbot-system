import { Request, Response } from "express";

import { query } from "../config/db";

export const getUnifiedInbox = async (req: Request, res: Response) => {
  const { botId } = req.params;

  if (!botId) {
    return res.status(400).json({ error: "botId is required" });
  }

  try {
    const result = await query(
      `
      SELECT 
        c.id,
        c.channel,
        c.status,
        ct.name,
        ct.platform_user_id,
        m.content->>'text' AS last_msg,
        m.created_at
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN LATERAL (
        SELECT content, created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) m ON true
      WHERE c.bot_id = $1
      ORDER BY m.created_at DESC NULLS LAST
      `,
      [botId]
    );

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
