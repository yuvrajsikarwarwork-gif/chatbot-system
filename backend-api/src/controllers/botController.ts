import { Response } from "express";
import fs from "fs";
import path from "path";
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
 * Also synchronizes the global .env file when a token is updated.
 */
export async function updateBotCtrl(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Bot ID is required" });

    // 1. Update the Database via Service (Handles partial updates like just the 'status')
    const bot = await updateBotService(id, req.user.id, req.body);
    
    // 2. Synchronize the .env file if an access token was provided
    if (req.body.wa_access_token) {
      try {
        const envPath = path.resolve(process.cwd(), '.env');
        let envConfig = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        const tokenRegex = /^WHATSAPP_ACCESS_TOKEN=.*$/m;
        const newTokenLine = `WHATSAPP_ACCESS_TOKEN=${req.body.wa_access_token}`;

        envConfig = tokenRegex.test(envConfig) 
          ? envConfig.replace(tokenRegex, newTokenLine) 
          : envConfig + `\n${newTokenLine}`;

        fs.writeFileSync(envPath, envConfig, 'utf8');
        
        // Inject into current process so no restart is needed for the engine
        process.env.WHATSAPP_ACCESS_TOKEN = req.body.wa_access_token;
        console.log("✅ [System] Global .env Token synchronized.");
      } catch (err: any) {
        console.warn("⚠️ [Warning] Failed to write to .env:", err.message);
      }
    }

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
    
    // Update activity timestamp to show the bot is being "worked on"
    const result = await query(
      "UPDATE bots SET updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, req.user.id]
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
    
    if (!wa_phone_number_id || !wa_access_token) {
      return res.status(400).json({ message: "WhatsApp credentials required." });
    }
    
    const bot = await createBotService(
      req.user.id, 
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
    await deleteBotService(id, req.user.id);
    res.status(204).send();
  } catch (error: any) {
    console.error("❌ deleteBotCtrl Error:", error.message);
    res.status(500).json({ message: error.message });
  }
}