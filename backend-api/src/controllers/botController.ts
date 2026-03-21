import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { query } from "../config/db"; 
import { 
  getBotsService,
  getBotService,
  createBotService,
  updateBotService,
  deleteBotService
} from "../services/botService";

/**
 * UNIFIED UPDATE CONTROLLER
 * Handles name, keywords, tokens, phone ID, and the Live Status toggle.
 */
export async function updateBotCtrl(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!id) return res.status(400).json({ message: "Bot ID is required" });
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // 1. Update the Database via Service (Handles partial updates like just the 'status')
    const bot = await updateBotService(id, userId, req.body);
    
    // NOTE: Removed .env synchronization logic. 
    // In a multi-tenant system, tokens must be retrieved dynamically from the DB per request.

    res.json(bot);
  } catch (error: any) {
    console.error("❌ updateBotCtrl Error:", error.message);
    res.status(error.status || 500).json({ message: error.message });
  }
}

/**
 * UNLOCK LOGIC (SLOT ACTIVATION)
 * This updates the bot's activity timestamp. 
 * The 'Max 5' slots limit is enforced on the Frontend.
 */
export async function activateBotCtrl(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!id) return res.status(400).json({ message: "Bot ID is required" });
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    
    // Update activity timestamp to show the bot is being "worked on"
    const result = await query(
      "UPDATE bots SET updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ message: "Bot not found" });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("❌ activateBotCtrl Error:", error.message);
    res.status(500).json({ message: error.message });
  }
}

/**
 * FETCH ALL BOTS
 */
export async function getBots(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    const bots = await getBotsService(req.user.id);
    res.json(bots);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * FETCH SINGLE BOT
 */
export async function getBot(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Bot ID is required" });
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    const bot = await getBotService(id, req.user.id);
    if (!bot) return res.status(404).json({ message: "Bot not found" });
    res.json(bot);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

/**
 * PROVISION NEW BOT
 */
export async function createBotCtrl(req: AuthRequest, res: Response) {
  try {
    const { name, wa_phone_number_id, wa_access_token, trigger_keywords } = req.body;
    const userId = req.user?.id;
    
    if (!wa_phone_number_id || !wa_access_token) {
      return res.status(400).json({ message: "WhatsApp credentials required." });
    }
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    
    const bot = await createBotService(
      userId, 
      name, 
      wa_phone_number_id, 
      wa_access_token, 
      trigger_keywords || ""
    );
    
    res.status(201).json(bot);
  } catch (error: any) {
    console.error("❌ createBotCtrl Error:", error.message);
    res.status(500).json({ message: error.message });
  }
}

/**
 * DELETE BOT
 */
export async function deleteBotCtrl(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Bot ID is required" });
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    await deleteBotService(id, req.user.id);
    res.status(204).send();
  } catch (error: any) {
    console.error("❌ deleteBotCtrl Error:", error.message);
    res.status(500).json({ message: error.message });
  }
}
