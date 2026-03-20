"use strict";
// src/models/analyticsModel.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.countMessagesByBot = countMessagesByBot;
exports.countConversationsByBot = countConversationsByBot;
exports.getEventsByBot = getEventsByBot;
const db_1 = require("../config/db");
async function countMessagesByBot(botId) {
    const res = await (0, db_1.query)(`
    SELECT COUNT(*) FROM messages m
    JOIN conversations c
    ON m.conversation_id = c.id
    WHERE c.bot_id = $1
    `, [botId]);
    return Number(res.rows[0].count);
}
async function countConversationsByBot(botId) {
    const res = await (0, db_1.query)(`
    SELECT COUNT(*) FROM conversations
    WHERE bot_id = $1
    `, [botId]);
    return Number(res.rows[0].count);
}
async function getEventsByBot(botId) {
    const res = await (0, db_1.query)(`
    SELECT *
    FROM analytics_events
    WHERE bot_id = $1
    ORDER BY created_at DESC
    LIMIT 100
    `, [botId]);
    return res.rows;
}
//# sourceMappingURL=analyticsModel.js.map