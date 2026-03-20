import axios from "axios";
import { query } from "../../config/db";
import { GenericMessage } from "../../services/messageRouter";
import { sendWhatsAppMessage } from "../../services/whatsappService";

const buildWhatsAppPayload = (toPhone: string, msg: GenericMessage) => {
  if (msg.type === "interactive" && msg.buttons?.length) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toPhone,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: msg.text || "Choose an option:"
        },
        action: {
          buttons: msg.buttons.slice(0, 3).map((button) => ({
            type: "reply",
            reply: {
              id: button.id,
              title: button.title
            }
          }))
        }
      }
    };
  }

  if (msg.type === "template" && msg.templateName) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toPhone,
      type: "template",
      template: {
        name: msg.templateName,
        language: {
          code: msg.languageCode || "en_US"
        }
      }
    };
  }

  if (msg.type === "media" && msg.mediaUrl) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toPhone,
      type: "image",
      image: {
        link: msg.mediaUrl
      }
    };
  }

  return null;
};

export const sendWhatsAppAdapter = async (
  botId: string,
  toPhone: string,
  msg: GenericMessage
) => {
  try {
    const integrationRes = await query(
      `SELECT credentials
       FROM integrations
       WHERE bot_id = $1 AND channel = 'whatsapp' AND is_active = true
       LIMIT 1`,
      [botId]
    );

    const credentials = integrationRes.rows[0]?.credentials;
    const phoneNumberId = credentials?.phone_number_id;
    const accessToken = credentials?.access_token;

    if (!phoneNumberId || !accessToken) {
      console.error(`[WhatsApp Adapter] Missing credentials for bot ${botId}`);
      return;
    }

    if (msg.type === "text" || msg.type === "system") {
      await sendWhatsAppMessage(phoneNumberId, accessToken, toPhone, msg.text || "");
      return;
    }

    const payload = buildWhatsAppPayload(toPhone, msg);
    if (!payload) {
      await sendWhatsAppMessage(
        phoneNumberId,
        accessToken,
        toPhone,
        msg.text || `[${msg.type}]`
      );
      return;
    }

    await axios.post(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error: any) {
    console.error("[WhatsApp Adapter Error]:", error.response?.data || error.message);
  }
};
