import axios from "axios";

export const sendWhatsAppMessage = async (
  phoneNumberId: string,
  accessToken: string,
  toPhone: string,
  messageText: string
) => {
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

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Message sent to ${toPhone}: ${response.data.messages[0].id}`);
    return response.data;
  } catch (error: any) {
    console.error("❌ WhatsApp API Error:", error.response?.data || error.message);
    throw error;
  }
};