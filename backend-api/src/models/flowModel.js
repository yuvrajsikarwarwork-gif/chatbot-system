"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFlowsByBot = findFlowsByBot;
exports.findFlowById = findFlowById;
exports.createFlow = createFlow;
exports.updateFlow = updateFlow;
exports.deleteFlow = deleteFlow;
const db_1 = require("../config/db");
async function findFlowsByBot(botId) {
    const res = await (0, db_1.query)("SELECT * FROM flows WHERE bot_id = $1 ORDER BY created_at DESC", [botId]);
    return res.rows;
}
async function findFlowById(id) {
    const res = await (0, db_1.query)("SELECT * FROM flows WHERE id = $1", [id]);
    return res.rows[0];
}
/**
 * UPSERT LOGIC: Handles both creation and updates.
 * Safely stringifies the entire flow object into the single flow_json column.
 */
async function createFlow(botId, flowJson) {
    const flowJsonStr = JSON.stringify(flowJson || { nodes: [], edges: [] });
    const res = await (0, db_1.query)(`
    INSERT INTO flows (bot_id, flow_json)
    VALUES ($1, $2::jsonb)
    ON CONFLICT (bot_id) 
    DO UPDATE SET 
      flow_json = EXCLUDED.flow_json, 
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
    `, [botId, flowJsonStr]);
    return res.rows[0];
}
async function updateFlow(id, botId, // ✅ Added tenant scope
flowJson) {
    const flowJsonStr = JSON.stringify(flowJson || { nodes: [], edges: [] });
    // ✅ DB-level tenant scoping enforced
    const res = await (0, db_1.query)(`
    UPDATE flows
    SET flow_json = $1::jsonb
    WHERE id = $2 AND bot_id = $3
    RETURNING *
    `, [flowJsonStr, id, botId]);
    return res.rows[0];
}
async function deleteFlow(id, botId) {
    // ✅ DB-level tenant scoping enforced
    await (0, db_1.query)("DELETE FROM flows WHERE id = $1 AND bot_id = $2", [id, botId]);
}
//# sourceMappingURL=flowModel.js.map