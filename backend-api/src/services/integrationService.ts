// src/services/integrationService.ts

import {
  findIntegrationsByBot,
  findIntegrationById,
  createIntegration,
  updateIntegration,
  deleteIntegration,
} from "../models/integrationModel";

import { findBotById } from "../models/botModel";

export async function getIntegrationsService(
  botId: string,
  userId: string
) {
  const bot = await findBotById(botId);

  if (!bot || bot.user_id !== userId) {
    throw { status: 404 };
  }

  return findIntegrationsByBot(botId);
}

export async function getIntegrationService(
  id: string,
  userId: string
) {
  const integ = await findIntegrationById(id);

  if (!integ) throw { status: 404 };

  const bot = await findBotById(integ.bot_id);

  if (!bot || bot.user_id !== userId) {
    throw { status: 404 };
  }

  return integ;
}

export async function createIntegrationService(
  botId: string,
  userId: string,
  type: string,
  config: any
) {
  const bot = await findBotById(botId);

  if (!bot || bot.user_id !== userId) {
    throw { status: 404 };
  }

  return createIntegration(botId, type, config);
}

export async function updateIntegrationService(
  id: string,
  userId: string,
  config: any
) {
  const integ = await findIntegrationById(id);

  if (!integ) throw { status: 404 };

  const bot = await findBotById(integ.bot_id);

  if (!bot || bot.user_id !== userId) {
    throw { status: 404 };
  }

  return updateIntegration(id, config);
}

export async function deleteIntegrationService(
  id: string,
  userId: string
) {
  const integ = await findIntegrationById(id);

  if (!integ) throw { status: 404 };

  const bot = await findBotById(integ.bot_id);

  if (!bot || bot.user_id !== userId) {
    throw { status: 404 };
  }

  await deleteIntegration(id);
}