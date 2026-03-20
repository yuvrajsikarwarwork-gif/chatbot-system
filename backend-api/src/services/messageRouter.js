"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeMessage = void 0;
const db_1 = require("../config/db");
const websiteAdapter_1 = require("../connectors/website/websiteAdapter");
const emailAdapter_1 = require("../connectors/email/emailAdapter");
const whatsappAdapter_1 = require("../connectors/whatsapp/whatsappAdapter");
const routeMessage = async (conversationId, message, io) => {
    try {
        // FIX 1: Extended Router Context Query (Full state retrieval)
        const convRes = await (0, db_1.query)(`
      SELECT 
        c.bot_id, 
        c.channel, 
        c.current_flow, 
        c.current_node, 
        c.status, 
        c.variables, 
        ct.platform_user_id 
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      WHERE c.id = $1
    `, [conversationId]);
        const context = convRes.rows[0];
        if (!context)
            return console.error(`[Router] Conv ${conversationId} not found.`);
        const { bot_id: botId, channel, platform_user_id: platformUserId } = context;
        // FIX 4: Message logging strictly uses conversation_id
        await (0, db_1.query)(`INSERT INTO messages (bot_id, conversation_id, channel, sender, platform_user_id, content)
       VALUES ($1, $2, $3, 'bot', $4, $5::jsonb)`, [botId, conversationId, channel, platformUserId, JSON.stringify(message)]);
        // Dashboard Sync
        if (io && message.type !== "system") {
            io.emit("dashboard_update", { conversationId, botId, channel, platformUserId, message, isBot: true });
        }
        // Template Resolution (Standardizing for Phase B)
        // Template Resolution: Fetch generic JSON structure for cross-channel rendering
        if (message.type === "template" && message.templateName) {
            const tplRes = await (0, db_1.query)("SELECT content, language FROM templates WHERE bot_id = $1 AND name = $2 LIMIT 1", [botId, message.templateName]);
            if (tplRes.rows[0]) {
                message.templateContent = tplRes.rows[0].content;
                message.languageCode = tplRes.rows[0].language || message.languageCode;
            }
            else {
                console.warn(`[Router] Template '${message.templateName}' not found in DB.`);
            }
        }
        // FIX 3: Router is the ONLY sender - Dispatches to isolated adapters
        if (channel === "whatsapp")
            await (0, whatsappAdapter_1.sendWhatsAppAdapter)(botId, platformUserId, message);
        else if (channel === "web")
            await (0, websiteAdapter_1.sendWebAdapter)(botId, platformUserId, message, io);
        else if (channel === "email")
            await (0, emailAdapter_1.sendEmailAdapter)(botId, platformUserId, message);
        else
            console.warn(`[Router] Unsupported channel '${channel}' for conversation ${conversationId}.`);
    }
    catch (err) {
        console.error("[Router Error]:", err.message);
    }
};
exports.routeMessage = routeMessage;
//# sourceMappingURL=messageRouter.js.map