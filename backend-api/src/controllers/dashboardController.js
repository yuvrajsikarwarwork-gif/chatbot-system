"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnifiedInbox = void 0;
const db_1 = require("../config/db");
const getUnifiedInbox = async (req, res) => {
    const { botId } = req.params;
    if (!botId) {
        return res.status(400).json({ error: "botId is required" });
    }
    try {
        const result = await (0, db_1.query)(`
      SELECT 
        c.id,
        c.channel,
        c.status,
        ct.name,
        ct.platform_user_id,
        m.content->>'text' AS last_msg,
        m.created_at
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN LATERAL (
        SELECT content, created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) m ON true
      WHERE c.bot_id = $1
      ORDER BY m.created_at DESC NULLS LAST
      `, [botId]);
        res.json(result.rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getUnifiedInbox = getUnifiedInbox;
//# sourceMappingURL=dashboardController.js.map