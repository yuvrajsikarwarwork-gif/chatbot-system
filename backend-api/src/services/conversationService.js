"use strict";
// src/services/conversationService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversationsService = getConversationsService;
exports.getConversationService = getConversationService;
exports.getConversationMessagesService = getConversationMessagesService;
const conversationModel_1 = require("../models/conversationModel");
const botModel_1 = require("../models/botModel");
async function getConversationsService(botId, userId) {
    const bot = await (0, botModel_1.findBotById)(botId);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404 };
    }
    return (0, conversationModel_1.findConversationsByBot)(botId);
}
async function getConversationService(id, userId) {
    const convo = await (0, conversationModel_1.findConversationById)(id);
    if (!convo)
        throw { status: 404 };
    const bot = await (0, botModel_1.findBotById)(convo.bot_id);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404 };
    }
    return convo;
}
async function getConversationMessagesService(id, userId) {
    const convo = await (0, conversationModel_1.findConversationById)(id);
    if (!convo)
        throw { status: 404 };
    const bot = await (0, botModel_1.findBotById)(convo.bot_id);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404 };
    }
    return (0, conversationModel_1.findMessagesForConversation)(id);
}
//# sourceMappingURL=conversationService.js.map