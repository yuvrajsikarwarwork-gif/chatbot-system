import { Request, Response } from "express";
import { query } from "../config/db";
import axios from "axios";

const DEFAULT_PHONE_ID = process.env.PHONE_NUMBER_ID || "1030050193525162";
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";

/**
 * Fetch all available templates from your database (Synced from Meta)
 */
export const getTemplates = async (req: Request, res: Response) => {  
  try {
    const result = await query("SELECT * FROM templates ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Launch a bulk broadcast to multiple leads
 */
export const launchCampaign = async (req: Request, res: Response) => {
  const { campaignName, templateName, language, leadsIds } = req.body;

  if (!templateName || !leadsIds || !leadsIds.length) {
    return res.status(400).json({ error: "Template and Lead IDs are required." });
  }

  try {
    // 1. Fetch the specific leads from the database
    const placeholders = leadsIds.map((_: any, i: number) => `$${i + 1}`).join(",");
    const leadsRes = await query(`SELECT id, wa_number, variables FROM leads WHERE id IN (${placeholders})`, leadsIds);
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
          url: `https://graph.facebook.com/v18.0/${DEFAULT_PHONE_ID}/messages`,
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
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        
        successCount++;
      } catch (err: any) {
        console.error(`Failed to send to ${lead.wa_number}:`, err.response?.data || err.message);
        failCount++;
      }
    }

    // 3. Log the campaign in the database
    await query(
      "INSERT INTO analytics_events (event_type, event_data, created_at) VALUES ($1, $2, NOW())",
      ["campaign_launched", JSON.stringify({ campaignName, templateName, successCount, failCount })]
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