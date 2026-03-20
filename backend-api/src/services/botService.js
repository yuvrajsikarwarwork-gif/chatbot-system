"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBotService = exports.updateBotService = exports.createBotService = exports.getBotService = exports.getBotsService = void 0;
const botModel_1 = require("../models/botModel");
const db_1 = require("../config/db");
const getBotsService = async (userId) => {
    return (0, botModel_1.findBotsByUser)(userId);
};
exports.getBotsService = getBotsService;
const getBotService = async (id, userId) => {
    const bot = await (0, botModel_1.findBotById)(id);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404, message: "Bot not found" };
    }
    return bot;
};
exports.getBotService = getBotService;
const createBotService = async (userId, name, wa_phone_number_id, wa_access_token, trigger_keywords) => {
    // Added 'status' to the initial creation (defaults to inactive)
    const result = await (0, db_1.query)(`INSERT INTO bots (user_id, name, wa_phone_number_id, wa_access_token, trigger_keywords, status) 
     VALUES ($1, $2, $3, $4, $5, 'inactive') RETURNING *`, [userId, name, wa_phone_number_id, wa_access_token, trigger_keywords]);
    return result.rows[0];
};
exports.createBotService = createBotService;
/**
 * UPDATED: Optimized to handle dynamic updates (Status, Meta Credentials, and Core Details)
 */
const updateBotService = async (id, userId, updateData) => {
    const bot = await (0, botModel_1.findBotById)(id);
    if (!bot || bot.user_id !== userId) {
        throw { status: 404, message: "Bot not found or unauthorized" };
    }
    // 🔄 DYNAMIC PAYLOAD: Merges existing bot data with incoming updates.
    // This allows the frontend to send ONLY { status: 'active' } OR the full object.
    const payload = {
        name: updateData.name ?? bot.name,
        trigger_keywords: updateData.trigger_keywords ?? bot.trigger_keywords,
        wa_phone_number_id: updateData.wa_phone_number_id ?? bot.wa_phone_number_id,
        wa_access_token: updateData.wa_access_token ?? bot.wa_access_token,
        status: updateData.status ?? bot.status // ✅ Added Status Logic
    };
    // ✅ Passing userId down to the model to strictly enforce tenant scoping
    return (0, botModel_1.updateBot)(id, userId, payload);
};
exports.updateBotService = updateBotService;
const deleteBotService = async (id, userId) => {
    const bot = await (0, botModel_1.findBotById)(id);
    if (!bot || bot.user_id !== userId)
        throw { status: 404, message: "Unauthorized" };
    // ✅ Passing userId down to the model to strictly enforce tenant scoping
    await (0, botModel_1.deleteBot)(id, userId);
};
exports.deleteBotService = deleteBotService;
//# sourceMappingURL=botService.js.map