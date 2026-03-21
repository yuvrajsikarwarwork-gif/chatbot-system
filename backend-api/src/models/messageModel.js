"use strict";
// src/models/messageModel.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessage = createMessage;
exports.findMessagesByConversation = findMessagesByConversation;
const db_1 = require("../config/db");
async function createMessage(conversationId, sender, text) {
    const contextRes = await (0, db_1.query)(`
    SELECT c.bot_id, c.channel, ct.platform_user_id
    FROM conversations c
    JOIN contacts ct ON c.contact_id = ct.id
    WHERE c.id = $1
    `, [conversationId]);
    const context = contextRes.rows[0];
    if (!context) {
        throw new Error("Conversation not found");
    }
    const res = await (0, db_1.query)(`
    INSERT INTO messages
    (bot_id, conversation_id, channel, sender, platform_user_id, content)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    RETURNING *
    `, [
        context.bot_id,
        conversationId,
        context.channel,
        sender,
        context.platform_user_id,
        JSON.stringify({ type: "text", text }),
    ]);
    return res.rows[0];
}
async function findMessagesByConversation(conversationId) {
    const res = await (0, db_1.query)(`
    SELECT * FROM messages
    WHERE conversation_id = $1
    ORDER BY created_at ASC
    `, [conversationId]);
    return res.rows;
}
//# sourceMappingURL=messageModel.js.map