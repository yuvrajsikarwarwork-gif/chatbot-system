import { 
  findBotsByUser, 
  findBotById, 
  updateBot, 
  deleteBot 
} from "../models/botModel";
import { query } from "../config/db";

export const getBotsService = async (userId: string) => {
  return findBotsByUser(userId);
};

export const getBotService = async (id: string, userId: string) => {
  const bot = await findBotById(id);
  if (!bot || bot.user_id !== userId) {
    throw { status: 404, message: "Bot not found" };
  }
  return bot;
};

export const createBotService = async (
  userId: string,
  name: string,
  wa_phone_number_id: string,
  wa_access_token: string,
  trigger_keywords: string
) => {
  // Added 'status' to the initial creation (defaults to inactive)
  const result = await query(
    `INSERT INTO bots (user_id, name, wa_phone_number_id, wa_access_token, trigger_keywords, status) 
     VALUES ($1, $2, $3, $4, $5, 'inactive') RETURNING *`,
    [userId, name, wa_phone_number_id, wa_access_token, trigger_keywords]
  );
  return result.rows[0];
};

/**
 * UPDATED: Optimized to handle dynamic updates (Status, Meta Credentials, and Core Details)
 */
export const updateBotService = async (id: string, userId: string, updateData: any) => {
  const bot = await findBotById(id);
  
  if (!bot || bot.user_id !== userId) {
    throw { status: 404, message: "Bot not found or unauthorized" };
  }

  // 🔄 DYNAMIC PAYLOAD: Merges existing bot data with incoming updates.
  // This allows the frontend to send ONLY { status: 'active' } OR the full object.
  const payload = {
    name: updateData.name ?? bot.name,
    trigger_keywords: updateData.trigger_keywords ?? bot.trigger_keywords,
    wa_phone_number_id: updateData.wa_phone_number_id ?? bot.wa_phone_number_id,
    wa_access_token: updateData.wa_access_token ?? bot.wa_access_token,
    status: updateData.status ?? bot.status // ✅ Added Status Logic
  };

  return updateBot(id, payload);
};

export const deleteBotService = async (id: string, userId: string) => {
  const bot = await findBotById(id);
  if (!bot || bot.user_id !== userId) throw { status: 404, message: "Unauthorized" };
  await deleteBot(id);
};