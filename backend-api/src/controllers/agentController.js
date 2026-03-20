"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAgentReply = exports.getConversationDetail = exports.replyToTicket = exports.closeTicket = exports.createTicket = exports.getTickets = void 0;
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
const sendAgentReply = async (req, res) => {
    const { conversationId } = req.params;
    const { text } = req.body;
    const io = req.app.get("io");
    if (!text)
        return res.status(400).json({ error: "Message text is required" });
    try {
        // 1. Mark status as 'agent_pending' to pause the bot
        await (0, db_1.query)("UPDATE conversations SET status = 'agent_pending', updated_at = NOW() WHERE id = $1", [conversationId]);
        // 2. Construct GenericMessage
        const message = {
            type: "text",
            text: text
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