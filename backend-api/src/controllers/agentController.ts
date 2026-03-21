import { Request, Response } from "express";

import { query } from "../config/db";
import { GenericMessage, routeMessage } from "../services/messageRouter";

export const getTickets = async (_req: Request, res: Response) => {
  res.status(200).json([]);
};

export const createTicket = async (_req: Request, res: Response) => {
  res.status(200).json({});
};

export const closeTicket = async (_req: Request, res: Response) => {
  res.status(200).json({});
};

export const replyToTicket = async (_req: Request, res: Response) => {
  res.status(200).json({});
};

export const getInboxConversations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const result = await query(
      `SELECT
         c.id,
         c.bot_id,
         c.channel,
         c.status,
         c.updated_at,
         ct.platform_user_id,
         ct.name AS display_name,
         ct.platform_user_id AS external_id,
         (c.status = 'agent_pending') AS agent_pending,
         latest.last_inbound_at
       FROM conversations c
       JOIN contacts ct ON c.contact_id = ct.id
       JOIN bots b ON c.bot_id = b.id
       LEFT JOIN LATERAL (
         SELECT MAX(created_at) FILTER (WHERE sender = 'user') AS last_inbound_at
         FROM messages m
         WHERE m.conversation_id = c.id
       ) latest ON true
       WHERE b.user_id = $1
       ORDER BY COALESCE(latest.last_inbound_at, c.updated_at) DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Backward-compatible alias while the frontend finishes migrating.
export const getInboxLeads = getInboxConversations;

export const getConversationDetail = async (req: Request, res: Response) => {
  const { conversationId } = req.params;

  try {
    const convRes = await query(
      `SELECT
         c.*,
         ct.name AS display_name,
         ct.platform_user_id AS external_id
       FROM conversations c
       JOIN contacts ct ON c.contact_id = ct.id
       WHERE c.id = $1`,
      [conversationId]
    );

    if (convRes.rows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messagesRes = await query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversationId]
    );

    res.json({
      ...convRes.rows[0],
      messages: messagesRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const resumeConversation = async (req: Request, res: Response) => {
  const { conversationId } = req.params;

  try {
    const result = await query(
      `UPDATE conversations
       SET status = 'active', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [conversationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json({ success: true, conversation: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const sendAgentReply = async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { text, type, templateName, languageCode } = req.body;
  const io = req.app.get("io");

  if (!conversationId) {
    return res.status(400).json({ error: "conversationId is required" });
  }

  if (type === "template" && !templateName) {
    return res.status(400).json({ error: "templateName is required" });
  }

  if (type !== "template" && !text) {
    return res.status(400).json({ error: "Message text is required" });
  }

  try {
    await query(
      "UPDATE conversations SET status = 'agent_pending', updated_at = NOW() WHERE id = $1",
      [conversationId]
    );

    const message: GenericMessage =
      type === "template"
        ? {
            type: "template",
            templateName,
            languageCode,
          }
        : {
            type: "text",
            text,
          };

    await routeMessage(conversationId, message, io);

    res.json({ success: true, message: "Reply sent" });
  } catch (err: any) {
    console.error("[Agent Reply Error]:", err.message);
    res.status(500).json({ error: "Failed to send agent reply" });
  }
};
