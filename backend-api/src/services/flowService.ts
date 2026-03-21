import { findBotById } from "../models/botModel";
import {
  createFlow,
  deleteFlow,
  findFlowById,
  findFlowsByBot,
  updateFlow,
} from "../models/flowModel";

// Legacy compatibility layer.
// Runtime message processing lives in flowEngine.ts.

export async function getFlowsByBotService(botId: string, userId: string) {
  const bot = await findBotById(botId);
  if (!bot || bot.user_id !== userId) {
    throw { status: 404, message: "Bot not found" };
  }

  return findFlowsByBot(botId);
}

export async function getFlowService(id: string, userId: string) {
  const flow = await findFlowById(id);
  if (!flow) {
    throw { status: 404, message: "Flow not found" };
  }

  const bot = await findBotById(flow.bot_id);
  if (!bot || bot.user_id !== userId) {
    throw { status: 404, message: "Flow not found" };
  }

  return flow;
}

export async function saveFlowService(
  botId: string,
  userId: string,
  flowJson: any
) {
  const bot = await findBotById(botId);
  if (!bot || bot.user_id !== userId) {
    throw { status: 404, message: "Bot not found" };
  }

  return createFlow(botId, flowJson);
}

export async function updateFlowService(
  id: string,
  userId: string,
  flowJson: any
) {
  const flow = await findFlowById(id);
  if (!flow) {
    throw { status: 404, message: "Flow not found" };
  }

  const bot = await findBotById(flow.bot_id);
  if (!bot || bot.user_id !== userId) {
    throw { status: 404, message: "Flow not found" };
  }

  return updateFlow(id, bot.id, flowJson);
}

export async function deleteFlowService(id: string, userId: string) {
  const flow = await findFlowById(id);
  if (!flow) {
    throw { status: 404, message: "Flow not found" };
  }

  const bot = await findBotById(flow.bot_id);
  if (!bot || bot.user_id !== userId) {
    throw { status: 404, message: "Flow not found" };
  }

  await deleteFlow(id, bot.id);
}
