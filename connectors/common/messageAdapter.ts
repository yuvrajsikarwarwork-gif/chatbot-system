const buildMessage = (
  bot_id: string,
  channel: string,
  user_identifier: string,
  message: string,
  timestamp?: number
) => {
  return {
    bot_id,
    channel,
    user_identifier,
    message,
    timestamp: timestamp || Date.now(),
  };
};

export const normalizeWebsite = (
  bot_id: string,
  user: string,
  text: string,
  time?: number
) => {
  return buildMessage(bot_id, "website", user, text, time);
};

export const normalizeWhatsapp = (
  bot_id: string,
  user: string,
  text: string,
  time?: number
) => {
  return buildMessage(bot_id, "whatsapp", user, text, time);
};

export const normalizeInstagram = (
  bot_id: string,
  user: string,
  text: string,
  time?: number
) => {
  return buildMessage(bot_id, "instagram", user, text, time);
};

export const normalizeFacebook = (
  bot_id: string,
  user: string,
  text: string,
  time?: number
) => {
  return buildMessage(bot_id, "facebook", user, text, time);
};