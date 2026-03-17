import { normalizeFacebook } from "../common/messageAdapter";

export const facebookAdapter = (
  bot_id: string,
  user: string,
  text: string
) => {
  return normalizeFacebook(bot_id, user, text);
};