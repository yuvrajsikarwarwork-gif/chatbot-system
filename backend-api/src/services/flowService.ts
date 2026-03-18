import {
  findFlowsByBot,
  findFlowById,
  createFlow,
  updateFlow,
  deleteFlow,
} from "../models/flowModel";
import { findBotById } from "../models/botModel";

/**
 * Retrieves flow by bot ID.
 */
export const getFlowsByBotService = async (botId: string, userId?: string) => {
  if (userId) {
    const bot = await findBotById(botId);
    if (!bot || bot.user_id !== userId) {
      throw { status: 404, message: "Unauthorized or bot not found" };
    }
  }

  const flows = await findFlowsByBot(botId);
  if (!flows || flows.length === 0) {
    return { nodes: [], edges: [] };
  }

  // ✅ FIX: Extract the actual flow_json content
  return flows[0].flow_json || { nodes: [], edges: [] };
};

/**
 * Retrieves a single flow, creating a default if none exists.
 */
export async function getFlowService(botId: string, userId: string) {
  const bot = await findBotById(botId);
  if (!bot || bot.user_id !== userId) {
    throw { status: 404, message: "Bot not found or unauthorized" };
  }

  const flows = await findFlowsByBot(botId);
  
  // ✅ FIX: Return the nested flow_json object
  if (flows && flows.length > 0) {
    return flows[0].flow_json || { nodes: [], edges: [] };
  }

  const defaultFlowJson = { nodes: [], edges: [] };
  const newFlow = await createFlow(botId, defaultFlowJson);
  return newFlow.flow_json;
}

/**
 * Handles Saving/Upserting flows.
 */
export async function saveFlowService(botId: string, userId: string, flowJson: any) {
  const bot = await findBotById(botId);
  if (!bot || bot.user_id !== userId) {
    throw { status: 404, message: "Bot not found or unauthorized" };
  }

  // Uses createFlow which should be an UPSERT in your model
  return createFlow(botId, flowJson);
}

export async function updateFlowService(id: string, userId: string, flowJson: any) {
  const flow = await findFlowById(id);
  if (!flow) throw { status: 404 };

  const bot = await findBotById(flow.bot_id);
  if (!bot || bot.user_id !== userId) throw { status: 404 };

  // ✅ Pass validated bot.id to model for strict execution boundary
  return updateFlow(id, bot.id, flowJson);
}

export async function deleteFlowService(id: string, userId: string) {
  const flow = await findFlowById(id);
  if (!flow) throw { status: 404 };

  const bot = await findBotById(flow.bot_id);
  if (!bot || bot.user_id !== userId) throw { status: 404 };

  // ✅ Pass validated bot.id to model for strict execution boundary
  await deleteFlow(id, bot.id);
}