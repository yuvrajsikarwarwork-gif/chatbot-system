"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlowsByBotService = void 0;
exports.getFlowService = getFlowService;
exports.saveFlowService = saveFlowService;
exports.updateFlowService = updateFlowService;
exports.deleteFlowService = deleteFlowService;
const flowModel_1 = require("../models/flowModel");
const botModel_1 = require("../models/botModel");
/**
 * Retrieves flow by bot ID.
 */
const getFlowsByBotService = async (botId, userId) => {
    if (userId) {
        const bot = await (0, botModel_1.findBotById)(botId);
        if (!bot || bot.user_id !== userId) {
            throw { status: 404, message: "Unauthorized or bot not found" };
        }
    }
    const flows = await (0, flowModel_1.findFlowsByBot)(botId);
    if (!flows || flows.length === 0) {
        return { nodes: [], edges: [] };
    }
    // ✅ FIX: Extract the actual flow_json content
    return flows[0].flow_json || { nodes: [], edges: [] };
};
exports.getFlowsByBotService = getFlowsByBotService;
/**
 * Retrieves a single flow, creating a default if none exists.
 */
async function getFlowService(botId, userId) {
    const bot = await (0, botModel_1.findBotById)(botId);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404, message: "Bot not found or unauthorized" };
    }
    const flows = await (0, flowModel_1.findFlowsByBot)(botId);
    // ✅ FIX: Return the nested flow_json object
    if (flows && flows.length > 0) {
        return flows[0].flow_json || { nodes: [], edges: [] };
    }
    const defaultFlowJson = { nodes: [], edges: [] };
    const newFlow = await (0, flowModel_1.createFlow)(botId, defaultFlowJson);
    return newFlow.flow_json;
}
/**
 * Handles Saving/Upserting flows.
 */
async function saveFlowService(botId, userId, flowJson) {
    const bot = await (0, botModel_1.findBotById)(botId);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404, message: "Bot not found or unauthorized" };
    }
    // Uses createFlow which should be an UPSERT in your model
    return (0, flowModel_1.createFlow)(botId, flowJson);
}
async function updateFlowService(id, userId, flowJson) {
    const flow = await (0, flowModel_1.findFlowById)(id);
    if (!flow)
        throw { status: 404 };
    const bot = await (0, botModel_1.findBotById)(flow.bot_id);
    if (!bot || bot.user_id !== userId)
        throw { status: 404 };
    // ✅ Pass validated bot.id to model for strict execution boundary
    return (0, flowModel_1.updateFlow)(id, bot.id, flowJson);
}
async function deleteFlowService(id, userId) {
    const flow = await (0, flowModel_1.findFlowById)(id);
    if (!flow)
        throw { status: 404 };
    const bot = await (0, botModel_1.findBotById)(flow.bot_id);
    if (!bot || bot.user_id !== userId)
        throw { status: 404 };
    // ✅ Pass validated bot.id to model for strict execution boundary
    await (0, flowModel_1.deleteFlow)(id, bot.id);
}
//# sourceMappingURL=flowService.js.map