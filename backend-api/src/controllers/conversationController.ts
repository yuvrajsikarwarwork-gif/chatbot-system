// backend-api/src/controllers/conversationController.ts

import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { query } from "../config/db";

import {
  getConversationsService,
  getConversationService,
  getConversationMessagesService,
} from "../services/conversationService";

export async function getConversations(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { botId } = req.params;
    const userId = req.user?.id;
    if (!botId) return res.status(400).json({ error: "botId is required" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const data = await getConversationsService(
      botId,
      userId
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getConversation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const data = await getConversationService(
      id,
      userId
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getMessages(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const data = await getConversationMessagesService(
      id,
      userId
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// ✅ Added missing function for the router
export async function updateConversationStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'closed', 'agent_pending'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    const result = await query(
        `UPDATE conversations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: "Conversation not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}
