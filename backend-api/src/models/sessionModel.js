"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearSession = exports.updateSessionNode = exports.getOrCreateSession = void 0;
const db_1 = require("../config/db");
const getOrCreateSession = async (botId, userPhone, defaultNodeId) => {
    // Attempt to find existing session
    const res = await (0, db_1.query)(`SELECT * FROM chat_sessions WHERE bot_id = $1 AND user_phone = $2`, [botId, userPhone]);
    if (res.rows.length > 0) {
        return res.rows[0];
    }
    // Create new session if none exists
    const insertRes = await (0, db_1.query)(`INSERT INTO chat_sessions (bot_id, user_phone, current_node_id, session_data) 
     VALUES ($1, $2, $3, '{}') RETURNING *`, [botId, userPhone, defaultNodeId]);
    return insertRes.rows[0];
};
exports.getOrCreateSession = getOrCreateSession;
const updateSessionNode = async (sessionId, nextNodeId, additionalData = {}) => {
    await (0, db_1.query)(`UPDATE chat_sessions 
     SET current_node_id = $1, 
         session_data = session_data || $2::jsonb, 
         updated_at = NOW() 
     WHERE id = $3`, [nextNodeId, JSON.stringify(additionalData), sessionId]);
};
exports.updateSessionNode = updateSessionNode;
const clearSession = async (sessionId) => {
    await (0, db_1.query)(`DELETE FROM chat_sessions WHERE id = $1`, [sessionId]);
};
exports.clearSession = clearSession;
//# sourceMappingURL=sessionModel.js.map