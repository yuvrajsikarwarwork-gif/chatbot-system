"use strict";
// src/models/integrationModel.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.findIntegrationsByBot = findIntegrationsByBot;
exports.findIntegrationById = findIntegrationById;
exports.createIntegration = createIntegration;
exports.updateIntegration = updateIntegration;
exports.deleteIntegration = deleteIntegration;
const db_1 = require("../config/db");
async function findIntegrationsByBot(botId) {
    const res = await (0, db_1.query)("SELECT * FROM integrations WHERE bot_id = $1", [botId]);
    return res.rows;
}
async function findIntegrationById(id) {
    const res = await (0, db_1.query)("SELECT * FROM integrations WHERE id = $1", [id]);
    return res.rows[0];
}
async function createIntegration(botId, type, config) {
    const res = await (0, db_1.query)(`
    INSERT INTO integrations (bot_id, type, config_json)
    VALUES ($1,$2,$3)
    RETURNING *
    `, [botId, type, config]);
    return res.rows[0];
}
async function updateIntegration(id, botId, config) {
    // DB-level scoping enforced
    const res = await (0, db_1.query)(`
    UPDATE integrations
    SET config_json = $1
    WHERE id = $2 AND bot_id = $3
    RETURNING *
    `, [config, id, botId]);
    return res.rows[0];
}
async function deleteIntegration(id, botId) {
    // DB-level scoping enforced
    await (0, db_1.query)("DELETE FROM integrations WHERE id = $1 AND bot_id = $2", [id, botId]);
}
//# sourceMappingURL=integrationModel.js.map