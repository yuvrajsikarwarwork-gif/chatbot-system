"use strict";
// src/services/integrationService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIntegrationsService = getIntegrationsService;
exports.getIntegrationService = getIntegrationService;
exports.createIntegrationService = createIntegrationService;
exports.updateIntegrationService = updateIntegrationService;
exports.deleteIntegrationService = deleteIntegrationService;
const integrationModel_1 = require("../models/integrationModel");
const botModel_1 = require("../models/botModel");
async function getIntegrationsService(botId, userId) {
    const bot = await (0, botModel_1.findBotById)(botId);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404 };
    }
    return (0, integrationModel_1.findIntegrationsByBot)(botId);
}
async function getIntegrationService(id, userId) {
    const integ = await (0, integrationModel_1.findIntegrationById)(id);
    if (!integ)
        throw { status: 404 };
    const bot = await (0, botModel_1.findBotById)(integ.bot_id);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404 };
    }
    return integ;
}
async function createIntegrationService(botId, userId, type, config) {
    const bot = await (0, botModel_1.findBotById)(botId);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404 };
    }
    return (0, integrationModel_1.createIntegration)(botId, type, config);
}
async function updateIntegrationService(id, userId, config) {
    const integ = await (0, integrationModel_1.findIntegrationById)(id);
    if (!integ)
        throw { status: 404 };
    const bot = await (0, botModel_1.findBotById)(integ.bot_id);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404 };
    }
    // Pass validated bot_id to enforce boundary in DB
    return (0, integrationModel_1.updateIntegration)(id, bot.id, config);
}
async function deleteIntegrationService(id, userId) {
    const integ = await (0, integrationModel_1.findIntegrationById)(id);
    if (!integ)
        throw { status: 404 };
    const bot = await (0, botModel_1.findBotById)(integ.bot_id);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404 };
    }
    // Pass validated bot_id to enforce boundary in DB
    await (0, integrationModel_1.deleteIntegration)(id, bot.id);
}
//# sourceMappingURL=integrationService.js.map