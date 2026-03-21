"use strict";
// backend-api/src/controllers/conversationController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversations = getConversations;
exports.getConversation = getConversation;
exports.getMessages = getMessages;
exports.updateConversationStatus = updateConversationStatus;
const db_1 = require("../config/db");
const conversationService_1 = require("../services/conversationService");
async function getConversations(req, res, next) {
    try {
        const { botId } = req.params;
        const userId = req.user?.id;
        if (!botId)
            return res.status(400).json({ error: "botId is required" });
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const data = await (0, conversationService_1.getConversationsService)(botId, userId);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function getConversation(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!id)
            return res.status(400).json({ error: "id is required" });
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const data = await (0, conversationService_1.getConversationService)(id, userId);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function getMessages(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!id)
            return res.status(400).json({ error: "id is required" });
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const data = await (0, conversationService_1.getConversationMessagesService)(id, userId);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
// ✅ Added missing function for the router
async function updateConversationStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['active', 'closed', 'agent_pending'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }
        const result = await (0, db_1.query)(`UPDATE conversations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [status, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=conversationController.js.map