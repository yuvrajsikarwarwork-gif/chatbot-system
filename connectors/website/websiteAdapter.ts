import { normalizeWebsite } from "../common/messageAdapter";

export const websiteAdapter = (
  bot_id: string,
  user: string,
  text: string
) => {
  return normalizeWebsite(bot_id, user, text);
};