import { normalizeInstagram } from "../common/messageAdapter";

export const instagramAdapter = (
  bot_id: string,
  user: string,
  text: string
) => {
  return normalizeInstagram(bot_id, user, text);
};