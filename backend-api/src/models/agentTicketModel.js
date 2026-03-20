"use strict";
// src/models/agentTicketModel.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTicket = createTicket;
exports.findTicketById = findTicketById;
exports.findTicketsByBot = findTicketsByBot;
exports.updateTicketStatus = updateTicketStatus;
const db_1 = require("../config/db");
async function createTicket(conversationId, status) {
    const res = await (0, db_1.query)(`
    INSERT INTO agent_tickets
    (conversation_id, status)
    VALUES ($1,$2)
    RETURNING *
    `, [conversationId, status]);
    return res.rows[0];
}
async function findTicketById(id) {
    const res = await (0, db_1.query)(`
    SELECT *
    FROM agent_tickets
    WHERE id = $1
    `, [id]);
    return res.rows[0];
}
async function findTicketsByBot(botId) {
    const res = await (0, db_1.query)(`
    SELECT t.*
    FROM agent_tickets t
    JOIN conversations c
    ON t.conversation_id = c.id
    WHERE c.bot_id = $1
    ORDER BY t.created_at DESC
    `, [botId]);
    return res.rows;
}
async function updateTicketStatus(id, status) {
    const res = await (0, db_1.query)(`
    UPDATE agent_tickets
    SET status = $1
    WHERE id = $2
    RETURNING *
    `, [status, id]);
    return res.rows[0];
}
//# sourceMappingURL=agentTicketModel.js.map