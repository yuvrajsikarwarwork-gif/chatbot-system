// src/services/analyticsService.ts

import {
  countMessagesByBot,
  countConversationsByBot,
  getEventsByBot,
} from "../models/analyticsModel";

import { findBotById } from "../models/botModel";

export async function getBotStatsService(
  botId: string,
  userId: string
) {
  const bot = await findBotById(botId);

  if (!bot || bot.user_id !== userId) {
    throw { status: 404 };
  }

  const messages = await countMessagesByBot(
    botId
  );

  const conversations =
    await countConversationsByBot(botId);

  return {
    messages,
    conversations,
  };
}

export async function getEventsService(
  botId: string,
  userId: string
) {
  const bot = await findBotById(botId);

  if (!bot || bot.user_id !== userId) {
    throw { status: 404 };
  }

  return getEventsByBot(botId);
}