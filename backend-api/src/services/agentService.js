"use strict";
// src/services/agentService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTicketService = createTicketService;
exports.getTicketsService = getTicketsService;
exports.closeTicketService = closeTicketService;
exports.replyTicketService = replyTicketService;
const agentTicketModel_1 = require("../models/agentTicketModel");
const conversationModel_1 = require("../models/conversationModel");
const botModel_1 = require("../models/botModel");
const messageModel_1 = require("../models/messageModel");
async function createTicketService(conversationId, userId) {
    const convo = await (0, conversationModel_1.findConversationById)(conversationId);
    if (!convo)
        throw { status: 404 };
    const bot = await (0, botModel_1.findBotById)(convo.bot_id);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404 };
    }
    return (0, agentTicketModel_1.createTicket)(conversationId, "open");
}
async function getTicketsService(botId, userId) {
    const bot = await (0, botModel_1.findBotById)(botId);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404 };
    }
    return (0, agentTicketModel_1.findTicketsByBot)(botId);
}
async function closeTicketService(ticketId, userId) {
    const ticket = await (0, agentTicketModel_1.findTicketById)(ticketId);
    if (!ticket)
        throw { status: 404 };
    const convo = await (0, conversationModel_1.findConversationById)(ticket.conversation_id);
    const bot = await (0, botModel_1.findBotById)(convo.bot_id);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404 };
    }
    return (0, agentTicketModel_1.updateTicketStatus)(ticketId, "closed");
}
async function replyTicketService(ticketId, userId, text) {
    const ticket = await (0, agentTicketModel_1.findTicketById)(ticketId);
    if (!ticket)
        throw { status: 404 };
    const convo = await (0, conversationModel_1.findConversationById)(ticket.conversation_id);
    const bot = await (0, botModel_1.findBotById)(convo.bot_id);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404 };
    }
    return (0, messageModel_1.createMessage)(convo.id, "agent", text);
}
//# sourceMappingURL=agentService.js.map