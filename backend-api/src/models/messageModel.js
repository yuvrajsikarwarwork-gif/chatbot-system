"use strict";
// src/models/messageModel.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessage = createMessage;
exports.findMessagesByConversation = findMessagesByConversation;
const db_1 = require("../config/db");
async function createMessage(conversationId, sender, text) {
    const res = await (0, db_1.query)(`
    INSERT INTO messages
    (conversation_id, sender, message)
    VALUES ($1,$2,$3)
    RETURNING *
    `, [conversationId, sender, text]);
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