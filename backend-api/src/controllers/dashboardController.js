"use strict";
// backend-api/src/controllers/dashboardController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnifiedInbox = void 0;
const getUnifiedInbox = async (req, res) => {
    const { botId } = req.params;
    try {
        const result = await query(`
      SELECT 
        c.id, c.channel, c.status, ct.name, ct.platform_user_id,
        m.content->>'text' as last_msg, m.created_at
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN LATERAL (
        SELECT content, created_at FROM messages 
        WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
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