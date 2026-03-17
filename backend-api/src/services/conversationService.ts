// src/services/conversationService.ts

import {
  findConversationsByBot,
  findConversationById,
  findMessagesForConversation,
} from "../models/conversationModel";

import { findBotById } from "../models/botModel";

export async function getConversationsService(
  botId: string,
  userId: string
) {
  const bot = await findBotById(botId);

  if (!bot || bot.user_id !== userId) {
    throw { status: 404 };
  }

  return findConversationsByBot(botId);
}

export async function getConversationService(
  id: string,
  userId: string
) {
  const convo = await findConversationById(id);

  if (!convo) throw { status: 404 };

  const bot = await findBotById(convo.bot_id);

  if (!bot || bot.user_id !== userId) {
    throw { status: 404 };
  }

  return convo;
}

export async function getConversationMessagesService(
  id: string,
  userId: string
) {
  const convo = await findConversationById(id);

  if (!convo) throw { status: 404 };

  const bot = await findBotById(convo.bot_id);

  if (!bot || bot.user_id !== userId) {
    throw { status: 404 };
  }

  return findMessagesForConversation(id);
}