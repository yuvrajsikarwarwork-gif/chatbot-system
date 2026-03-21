"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAgentReply = exports.resumeConversation = exports.getConversationDetail = exports.getInboxLeads = exports.getInboxConversations = exports.replyToTicket = exports.closeTicket = exports.createTicket = exports.getTickets = void 0;
const db_1 = require("../config/db");
const messageRouter_1 = require("../services/messageRouter");
const getTickets = async (_req, res) => {
    res.status(200).json([]);
};
exports.getTickets = getTickets;
const createTicket = async (_req, res) => {
    res.status(200).json({});
};
exports.createTicket = createTicket;
const closeTicket = async (_req, res) => {
    res.status(200).json({});
};
exports.closeTicket = closeTicket;
const replyToTicket = async (_req, res) => {
    res.status(200).json({});
};
exports.replyToTicket = replyToTicket;
const getInboxConversations = async (req, res) => {
    try {
        const userId = req.user?.id;
        const result = await (0, db_1.query)(`SELECT
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
       ORDER BY COALESCE(latest.last_inbound_at, c.updated_at) DESC`, [userId]);
        res.json(result.rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getInboxConversations = getInboxConversations;
// Backward-compatible alias while the frontend finishes migrating.
exports.getInboxLeads = exports.getInboxConversations;
const getConversationDetail = async (req, res) => {
    const { conversationId } = req.params;
    try {
        const convRes = await (0, db_1.query)(`SELECT
         c.*,
         ct.name AS display_name,
         ct.platform_user_id AS external_id
       FROM conversations c
       JOIN contacts ct ON c.contact_id = ct.id
       WHERE c.id = $1`, [conversationId]);
        if (convRes.rows.length === 0) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        const messagesRes = await (0, db_1.query)(`SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`, [conversationId]);
        res.json({
            ...convRes.rows[0],
            messages: messagesRes.rows,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getConversationDetail = getConversationDetail;
const resumeConversation = async (req, res) => {
    const { conversationId } = req.params;
    try {
        const result = await (0, db_1.query)(`UPDATE conversations
       SET status = 'active', updated_at = NOW()
       WHERE id = $1
       RETURNING *`, [conversationId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        res.json({ success: true, conversation: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.resumeConversation = resumeConversation;
const sendAgentReply = async (req, res) => {
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
        await (0, db_1.query)("UPDATE conversations SET status = 'agent_pending', updated_at = NOW() WHERE id = $1", [conversationId]);
        const message = type === "template"
            ? {
                type: "template",
                templateName,
                languageCode,
            }
            : {
                type: "text",
                text,
            };
        await (0, messageRouter_1.routeMessage)(conversationId, message, io);
        res.json({ success: true, message: "Reply sent" });
    }
    catch (err) {
        console.error("[Agent Reply Error]:", err.message);
        res.status(500).json({ error: "Failed to send agent reply" });
    }
};
exports.sendAgentReply = sendAgentReply;
//# sourceMappingURL=agentController.js.map