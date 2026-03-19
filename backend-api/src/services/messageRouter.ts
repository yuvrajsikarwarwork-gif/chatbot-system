// backend-api/src/services/messageRouter.ts

import { query } from "../config/db";
import { sendWebAdapter } from "../connectors/website/websiteAdapter";
import { sendEmailAdapter } from "../connectors/email/emailAdapter";
import { sendWhatsAppAdapter } from "../connectors/whatsapp/whatsappAdapter";

export interface GenericMessage {
  type: "text" | "interactive" | "system" | "template";
  text?: string;
  buttons?: { id: string; title: string }[];
  templateName?: string;
  languageCode?: string;
  templateContent?: any; 
}

export const routeMessage = async (
  conversationId: string | number, 
  message: GenericMessage,
  io?: any
) => {
  try {
    const convRes = await query(`
      SELECT c.bot_id, c.channel, ct.platform_user_id 
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      WHERE c.id = $1
    `, [conversationId]);

    const context = convRes.rows[0];
    if (!context) {
      console.error(`[Router Error]: Conversation context not found for ID ${conversationId}`);
      return;
    }

    const { bot_id: botId, channel, platform_user_id: platformUserId } = context;

    await query(
      `INSERT INTO messages (bot_id, conversation_id, channel, sender, platform_user_id, content)
       VALUES ($1, $2, $3, 'bot', $4, $5)`,
      [botId, conversationId, channel, platformUserId, JSON.stringify(message)]
    );

    // ✅ STANDARD DASHBOARD SYNC (Outbound)
    if (io && message.type !== "system") {
      io.emit("dashboard_update", { 
        conversationId,
        botId, 
        channel,
        platformUserId, 
        text: message.text || (message.type === "template" ? `[Template: ${message.templateName}]` : "[Interactive Element]"), 
        isBot: true,
        timestamp: new Date().toISOString()
      });
    }

    if (message.type === "template" && message.templateName) {
      try {
        const tplRes = await query("SELECT content FROM templates WHERE bot_id = $1 AND name = $2", [botId, message.templateName]);
        if (tplRes.rows[0]?.content) {
          message.templateContent = tplRes.rows[0].content;
        }
      } catch (err) {
        console.error(`[Router Error]: Failed to resolve template JSON for ${message.templateName}`);
      }
    }

    if (channel === "whatsapp") {
      await sendWhatsAppAdapter(botId, platformUserId, message);
    } else if (channel === "web") {
      await sendWebAdapter(botId, platformUserId, message, io);
    } else if (channel === "email") {
      await sendEmailAdapter(botId, platformUserId, message);
    }
    
  } catch (err: any) {
    console.error("[Router Error]:", err.message);
  }
};