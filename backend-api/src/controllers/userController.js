"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.inviteTeammate = void 0;
const db_1 = require("../config/db");
/**
 * Invite a teammate to a Bot Workspace
 */
const inviteTeammate = async (req, res, next) => {
    try {
        const { botId, email, role } = req.body;
        // 1. Verify Requesting User is the Bot Owner/Admin
        const botCheck = await (0, db_1.query)("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [botId, req.user.id]);
        if (!botCheck.rows.length)
            return res.status(403).json({ error: "Unauthorized" });
        // 2. Find target user
        const userRes = await (0, db_1.query)("SELECT id FROM users WHERE email = $1", [email]);
        if (!userRes.rows.length)
            return res.status(404).json({ error: "User not found. They must sign up first." });
        const targetUserId = userRes.rows[0].id;
        // 3. Create Assignment
        await (0, db_1.query)(`INSERT INTO bot_assignments (bot_id, user_id, role) 
       VALUES ($1, $2, $3) ON CONFLICT (bot_id, user_id) DO UPDATE SET role = $3`, [botId, targetUserId, role || 'agent']);
        res.json({ success: true, message: "Teammate added successfully" });
    }
    catch (err) {
        next(err);
    }
};
exports.inviteTeammate = inviteTeammate;
/**
 * Update Personal User Settings
 */
const updateProfile = async (req, res, next) => {
    try {
        const { name } = req.body;
        const result = await (0, db_1.query)("UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, role", [name, req.user.id]);
        res.json(result.rows[0]);
    }
    catch (err) {
        next(err);
    }
};
exports.updateProfile = updateProfile;
//# sourceMappingURL=userController.js.map