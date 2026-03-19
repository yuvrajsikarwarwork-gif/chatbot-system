// backend-api/src/controllers/agentController.ts

import { Request, Response } from "express";
import { routeMessage, GenericMessage } from "../services/messageRouter";
import { query } from "../config/db";

/**
 * POST /api/conversations/:conversationId/reply
 * Sends a manual message from the Admin Dashboard to the user.
 */
export const sendAgentReply = async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { text } = req.body;
  const io = req.app.get("io");

  if (!text) return res.status(400).json({ error: "Message text is required" });

  try {
    // 1. Mark conversation as 'agent_pending' if it wasn't already 
    // (This pauses the bot so it doesn't interrupt the human)
    await query(
      "UPDATE conversations SET status = 'agent_pending', updated_at = NOW() WHERE id = $1", 
      [conversationId]
    );

    // 2. Construct the GenericMessage
    const message: GenericMessage = {
      type: "text",
      text: text
    };

    // 3. Route it! The router handles finding the Bot, Channel, and Platform ID.
    await routeMessage(conversationId, message, io);

    res.json({ success: true, message: "Reply sent via router" });
  } catch (err: any) {
    console.error("[Agent Reply Error]:", err.message);
    res.status(500).json({ error: "Failed to send agent reply" });
  }
};