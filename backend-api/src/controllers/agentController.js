"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAgentReply = exports.resumeConversation = exports.getConversationDetail = exports.getInboxLeads = exports.replyToTicket = exports.closeTicket = exports.createTicket = exports.getTickets = void 0;
const messageRouter_1 = require("../services/messageRouter");
const db_1 = require("../config/db");
// ==========================================
// 1. RESTORED TICKET FUNCTIONS (Prevents Crash)
// ==========================================
// Note: Paste your original ticket logic inside these blocks if you have it.
// These empty exports stop the "Route.get() requires a callback" error immediately.
const getTickets = async (req, res) => {
    res.status(200).json([]);
};
exports.getTickets = getTickets;
const createTicket = async (req, res) => {
    res.status(200).json({});
};
exports.createTicket = createTicket;
const closeTicket = async (req, res) => {
    res.status(200).json({});
};
exports.closeTicket = closeTicket;
const replyToTicket = async (req, res) => {
    res.status(200).json({});
};
exports.replyToTicket = replyToTicket;
// ==========================================
// 2. NEW INBOX FUNCTIONS
// ==========================================
const getInboxLeads = async (req, res) => {
    try {
        const userId = req.user?.id;
        const result = await (0, db_1.query)(`SELECT
         c.id,
         c.bot_id,
         c.channel,
         c.status,
         c.updated_at,
         ct.platform_user_id,
         ct.name AS user_name,
         ct.name AS wa_name,
         ct.platform_user_id AS wa_number,
         (c.status = 'agent_pending') AS human_active,
         latest.last_user_msg_at
       FROM conversations c
       JOIN contacts ct ON c.contact_id = ct.id
       JOIN bots b ON c.bot_id = b.id
       LEFT JOIN LATERAL (
         SELECT MAX(created_at) FILTER (WHERE sender = 'user') AS last_user_msg_at
         FROM messages m
         WHERE m.conversation_id = c.id
       ) latest ON true
       WHERE b.user_id = $1
       ORDER BY COALESCE(latest.last_user_msg_at, c.updated_at) DESC`, [userId]);
        res.json(result.rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getInboxLeads = getInboxLeads;
/**
 * GET /api/conversations/:conversationId
 * Fetches the full conversation details and message history.
 */
const getConversationDetail = async (req, res) => {
    const { conversationId } = req.params;
    try {
        const convRes = await (0, db_1.query)(`SELECT c.*, ct.name, ct.platform_user_id 
       FROM conversations c 
       JOIN contacts ct ON c.contact_id = ct.id 
       WHERE c.id = $1`, [conversationId]);
        if (convRes.rows.length === 0)
            return res.status(404).json({ error: "Conversation not found" });
        const messagesRes = await (0, db_1.query)(`SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`, [conversationId]);
        res.json({
            ...convRes.rows[0],
            messages: messagesRes.rows
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getConversationDetail = getConversationDetail;
/**
 * POST /api/conversations/:conversationId/reply
 * Sends a manual message from the Admin Dashboard to the user.
 */
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
    if (!conversationId)
        return res.status(400).json({ error: "conversationId is required" });
    if (type === "template" && !templateName)
        return res.status(400).json({ error: "templateName is required" });
    if (type !== "template" && !text)
        return res.status(400).json({ error: "Message text is required" });
    try {
        // 1. Mark status as 'agent_pending' to pause the bot
        await (0, db_1.query)("UPDATE conversations SET status = 'agent_pending', updated_at = NOW() WHERE id = $1", [conversationId]);
        // 2. Construct GenericMessage
        const message = type === "template"
            ? {
                type: "template",
                templateName,
                languageCode
            }
            : {
                type: "text",
                text
            };
        // 3. Route via centralized router
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