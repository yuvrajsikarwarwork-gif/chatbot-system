"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findBotsByUser = findBotsByUser;
exports.findBotById = findBotById;
exports.createBot = createBot;
exports.updateBot = updateBot;
exports.deleteBot = deleteBot;
const db_1 = require("../config/db");
async function findBotsByUser(userId) {
    // ✅ Sorting by 'active' status first ensures a better UX in the Instance Manager.
    const res = await (0, db_1.query)("SELECT * FROM bots WHERE user_id = $1 ORDER BY status = 'active' DESC, created_at DESC", [userId]);
    return res.rows;
}
async function findBotById(id) {
    const res = await (0, db_1.query)("SELECT * FROM bots WHERE id = $1", [id]);
    return res.rows[0];
}
async function createBot(userId, name) {
    // ✅ Explicitly setting 'inactive' on creation prevents ghost triggers before configuration.
    const res = await (0, db_1.query)("INSERT INTO bots (user_id, name, status) VALUES ($1, $2, 'inactive') RETURNING *", [userId, name]);
    return res.rows[0];
}
async function updateBot(id, userId, data) {
    // ✅ The ::text casting prevents type-mismatch errors when passing nulls for UUID or JSON fields.
    // ✅ Scoped to user_id to prevent cross-tenant data mutation.
    const res = await (0, db_1.query)(`
    UPDATE bots
    SET 
      name = CASE WHEN $1::text IS NOT NULL THEN $1 ELSE name END,
      wa_phone_number_id = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE wa_phone_number_id END,
      wa_access_token = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE wa_access_token END,
      trigger_keywords = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE trigger_keywords END,
      status = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE status END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $6 AND user_id = $7
    RETURNING *
    `, [
        data.name !== undefined ? data.name : null,
        data.wa_phone_number_id !== undefined ? data.wa_phone_number_id : null,
        data.wa_access_token !== undefined ? data.wa_access_token : null,
        data.trigger_keywords !== undefined ? data.trigger_keywords : null,
        data.status !== undefined ? data.status : null,
        id,
        userId
    ]);
    return res.rows[0];
}
async function deleteBot(id, userId) {
    // ✅ Scoped to user_id to prevent cross-tenant data deletion.
    await (0, db_1.query)("DELETE FROM bots WHERE id = $1 AND user_id = $2", [id, userId]);
}
//# sourceMappingURL=botModel.js.map