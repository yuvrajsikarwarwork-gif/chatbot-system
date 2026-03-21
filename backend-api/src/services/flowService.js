"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlowsByBotService = getFlowsByBotService;
exports.getFlowService = getFlowService;
exports.saveFlowService = saveFlowService;
exports.updateFlowService = updateFlowService;
exports.deleteFlowService = deleteFlowService;
const botModel_1 = require("../models/botModel");
const flowModel_1 = require("../models/flowModel");
// Legacy compatibility layer.
// Runtime message processing lives in flowEngine.ts.
async function getFlowsByBotService(botId, userId) {
    const bot = await (0, botModel_1.findBotById)(botId);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404, message: "Bot not found" };
    }
    return (0, flowModel_1.findFlowsByBot)(botId);
}
async function getFlowService(id, userId) {
    const flow = await (0, flowModel_1.findFlowById)(id);
    if (!flow) {
        throw { status: 404, message: "Flow not found" };
    }
    const bot = await (0, botModel_1.findBotById)(flow.bot_id);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404, message: "Flow not found" };
    }
    return flow;
}
async function saveFlowService(botId, userId, flowJson) {
    const bot = await (0, botModel_1.findBotById)(botId);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404, message: "Bot not found" };
    }
    return (0, flowModel_1.createFlow)(botId, flowJson);
}
async function updateFlowService(id, userId, flowJson) {
    const flow = await (0, flowModel_1.findFlowById)(id);
    if (!flow) {
        throw { status: 404, message: "Flow not found" };
    }
    const bot = await (0, botModel_1.findBotById)(flow.bot_id);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404, message: "Flow not found" };
    }
    return (0, flowModel_1.updateFlow)(id, bot.id, flowJson);
}
async function deleteFlowService(id, userId) {
    const flow = await (0, flowModel_1.findFlowById)(id);
    if (!flow) {
        throw { status: 404, message: "Flow not found" };
    }
    const bot = await (0, botModel_1.findBotById)(flow.bot_id);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404, message: "Flow not found" };
    }
    await (0, flowModel_1.deleteFlow)(id, bot.id);
}
//# sourceMappingURL=flowService.js.map