"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppMessage = void 0;
const axios_1 = __importDefault(require("axios"));
const sendWhatsAppMessage = async (phoneNumberId, accessToken, toPhone, messageText) => {
    try {
        const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: toPhone,
            type: "text",
            text: {
                preview_url: false,
                body: messageText
            }
        };
        const response = await axios_1.default.post(url, payload, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });
        console.log(`✅ Message sent to ${toPhone}: ${response.data.messages[0].id}`);
        return response.data;
    }
    catch (error) {
        console.error("❌ WhatsApp API Error:", error.response?.data || error.message);
        throw error;
    }
};
exports.sendWhatsAppMessage = sendWhatsAppMessage;
//# sourceMappingURL=whatsappService.js.map