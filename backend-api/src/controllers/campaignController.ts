import { Response } from "express";
import { query } from "../config/db";
import axios from "axios";
import { AuthRequest } from "../middleware/authMiddleware";

/**
 * Fetch all available templates from your database (Synced from Meta)
 */
export const getTemplates = async (req: AuthRequest, res: Response) => {  
  try {
    const { botId } = req.params;
    
    // ✅ MULTI-TENANCY: Verify Bot Ownership
    const botRes = await query("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [botId, req.user!.id]);
    if (!botRes.rows.length) return res.status(403).json({ error: "Unauthorized" });

    // ✅ Scoped template retrieval
    const result = await query("SELECT * FROM templates WHERE bot_id = $1 ORDER BY created_at DESC", [botId]);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Launch a bulk broadcast to multiple leads
 */
export const launchCampaign = async (req: AuthRequest, res: Response) => {
  const { botId, campaignName, templateName, language, leadsIds } = req.body;

  if (!botId || !templateName || !leadsIds || !leadsIds.length) {
    return res.status(400).json({ error: "Bot ID, Template, and Lead IDs are required." });
  }

  try {
    // ✅ MULTI-TENANCY: Verify Bot Ownership & Fetch Credentials Dynamically
    const botRes = await query(
      "SELECT wa_phone_number_id, wa_access_token FROM bots WHERE id = $1 AND user_id = $2 AND status = 'active'", 
      [botId, req.user!.id]
    );
    const targetBot = botRes.rows[0];

    if (!targetBot) {
      return res.status(403).json({ error: "Unauthorized or Bot inactive." });
    }

    const phoneId = targetBot.wa_phone_number_id;
    const token = targetBot.wa_access_token;

    // 1. Fetch the specific leads from the database (✅ Scoped to botId to prevent IDOR)
    const placeholders = leadsIds.map((_: any, i: number) => `$${i + 2}`).join(",");
    const leadsRes = await query(
      `SELECT id, wa_number, variables FROM leads WHERE bot_id = $1 AND id IN (${placeholders})`, 
      [botId, ...leadsIds]
    );
    const targetLeads = leadsRes.rows;

    let successCount = 0;
    let failCount = 0;

    // 2. Loop through leads and fire the template
    // Note: For massive lists (10k+), this should be moved to a Redis queue. 
    // For lists under 500, this simple loop is perfectly fine.
    for (const lead of targetLeads) {
      try {
        await axios({
          method: "POST",
          url: `https://graph.facebook.com/v18.0/${phoneId}/messages`,
          data: {
            messaging_product: "whatsapp",
            to: lead.wa_number,
            type: "template",
            template: {
              name: templateName,
              language: { code: language || "en_US" }
              // Dynamic variable injection can be added here if templates require it
            }
          },
          headers: { Authorization: `Bearer ${token}` }
        });
        
        successCount++;
      } catch (err: any) {
        console.error(`Failed to send to ${lead.wa_number}:`, err.response?.data || err.message);
        failCount++;
      }
    }

    // 3. Log the campaign in the database (✅ Scoped to botId)
    await query(
      "INSERT INTO analytics_events (bot_id, event_type, event_data, created_at) VALUES ($1, $2, $3, NOW())",
      [botId, "campaign_launched", JSON.stringify({ campaignName, templateName, successCount, failCount })]
    );

    res.json({ 
      success: true, 
      message: `Campaign launched. Success: ${successCount}, Failed: ${failCount}` 
    });

  } catch (error: any) {
    console.error("Campaign Launch Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};