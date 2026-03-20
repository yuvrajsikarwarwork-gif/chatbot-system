import { Request, Response } from "express";
import { routeMessage, GenericMessage } from "../services/messageRouter";
import { query } from "../config/db";

// ==========================================
// 1. RESTORED TICKET FUNCTIONS (Prevents Crash)
// ==========================================
// Note: Paste your original ticket logic inside these blocks if you have it.
// These empty exports stop the "Route.get() requires a callback" error immediately.

export const getTickets = async (req: Request, res: Response) => {
  res.status(200).json([]); 
};

export const createTicket = async (req: Request, res: Response) => {
  res.status(200).json({});
};

export const closeTicket = async (req: Request, res: Response) => {
  res.status(200).json({});
};

export const replyToTicket = async (req: Request, res: Response) => {
  res.status(200).json({});
};

// ==========================================
// 2. NEW INBOX FUNCTIONS
// ==========================================

/**
 * GET /api/conversations/:conversationId
 * Fetches the full conversation details and message history.
 */
export const getConversationDetail = async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  try {
    const convRes = await query(
      `SELECT c.*, ct.name, ct.platform_user_id 
       FROM conversations c 
       JOIN contacts ct ON c.contact_id = ct.id 
       WHERE c.id = $1`, 
      [conversationId]
    );

    if (convRes.rows.length === 0) return res.status(404).json({ error: "Conversation not found" });

    const messagesRes = await query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversationId]
    );

    res.json({
      ...convRes.rows[0],
      messages: messagesRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

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
    // 1. Mark status as 'agent_pending' to pause the bot
    await query(
      "UPDATE conversations SET status = 'agent_pending', updated_at = NOW() WHERE id = $1", 
      [conversationId]
    );

    // 2. Construct GenericMessage
    const message: GenericMessage = {
      type: "text",
      text: text
    };

    // 3. Route via centralized router
    await routeMessage(conversationId, message, io);

    res.json({ success: true, message: "Reply sent" });
  } catch (err: any) {
    console.error("[Agent Reply Error]:", err.message);
    res.status(500).json({ error: "Failed to send agent reply" });
  }
};