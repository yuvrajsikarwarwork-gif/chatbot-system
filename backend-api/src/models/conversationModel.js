"use strict";
// src/models/conversationModel.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.findConversation = findConversation;
exports.createConversation = createConversation;
exports.findConversationsByBot = findConversationsByBot;
exports.findConversationById = findConversationById;
exports.findMessagesForConversation = findMessagesForConversation;
const db_1 = require("../config/db");
async function findConversation(botId, channel, externalId) {
    const res = await (0, db_1.query)(`
    SELECT * FROM conversations
    WHERE bot_id = $1
    AND channel = $2
    AND user_identifier = $3
    `, [botId, channel, externalId]);
    return res.rows[0];
}
async function createConversation(botId, channel, externalId) {
    const res = await (0, db_1.query)(`
    INSERT INTO conversations
    (bot_id, channel, user_identifier)
    VALUES ($1,$2,$3)
    RETURNING *
    `, [botId, channel, externalId]);
    return res.rows[0];
}
// add below existing code
async function findConversationsByBot(botId) {
    const res = await (0, db_1.query)(`
    SELECT *
    FROM conversations
    WHERE bot_id = $1
    ORDER BY created_at DESC
    `, [botId]);
    return res.rows;
}
async function findConversationById(id) {
    const res = await (0, db_1.query)(`
    SELECT *
    FROM conversations
    WHERE id = $1
    `, [id]);
    return res.rows[0];
}
async function findMessagesForConversation(conversationId) {
    const res = await (0, db_1.query)(`
    SELECT *
    FROM messages
    WHERE conversation_id = $1
    ORDER BY created_at ASC
    `, [conversationId]);
    return res.rows;
}
//# sourceMappingURL=conversationModel.js.map