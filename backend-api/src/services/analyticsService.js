"use strict";
// src/services/analyticsService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBotStatsService = getBotStatsService;
exports.getEventsService = getEventsService;
const analyticsModel_1 = require("../models/analyticsModel");
const botModel_1 = require("../models/botModel");
async function getBotStatsService(botId, userId) {
    const bot = await (0, botModel_1.findBotById)(botId);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404 };
    }
    const messages = await (0, analyticsModel_1.countMessagesByBot)(botId);
    const conversations = await (0, analyticsModel_1.countConversationsByBot)(botId);
    return {
        messages,
        conversations,
    };
}
async function getEventsService(botId, userId) {
    const bot = await (0, botModel_1.findBotById)(botId);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404 };
    }
    return (0, analyticsModel_1.getEventsByBot)(botId);
}
//# sourceMappingURL=analyticsService.js.map