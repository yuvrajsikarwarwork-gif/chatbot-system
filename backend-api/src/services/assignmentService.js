"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignUserToBot = void 0;
const db_1 = require("../config/db");
const assignUserToBot = async (botId, email, role) => {
    // 1. Find user by email
    const userRes = await (0, db_1.query)("SELECT id FROM users WHERE email = $1", [email]);
    if (userRes.rowCount === 0)
        throw new Error("User not found. They must register first.");
    const userId = userRes.rows[0].id;
    // 2. Create assignment
    await (0, db_1.query)(`INSERT INTO bot_assignments (bot_id, user_id, assigned_role) 
     VALUES ($1, $2, $3) ON CONFLICT (bot_id, user_id) DO UPDATE SET assigned_role = $3`, [botId, userId, role]);
    return { success: true };
};
exports.assignUserToBot = assignUserToBot;
//# sourceMappingURL=assignmentService.js.map