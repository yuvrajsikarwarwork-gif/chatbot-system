import { normalizeWhatsapp } from "../common/messageAdapter";

export const whatsappAdapter = (
  bot_id: string,
  phone: string,
  text: string
) => {
  return normalizeWhatsapp(bot_id, phone, text);
};