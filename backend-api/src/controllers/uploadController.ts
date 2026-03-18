import { Response } from "express";
import { query } from "../config/db";
import csv from "csv-parser";
import fs from "fs";
import { AuthRequest } from "../middleware/authMiddleware";

export const uploadLeadsCSV = async (req: AuthRequest, res: Response) => {
  const { bot_id, template_id, campaign_name } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "No file uploaded" });

  if (!bot_id) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    return res.status(400).json({ error: "bot_id is required" });
  }

  try {
    // ✅ MULTI-TENANCY: Verify Bot Ownership BEFORE processing
    const botRes = await query("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [bot_id, req.user!.id]);
    
    if (botRes.rows.length === 0) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).json({ error: "Unauthorized or bot not found" });
    }

    const leads: any[] = [];

    // Parse CSV file
    fs.createReadStream(file.path)
      .pipe(csv())
      .on("data", (data) => leads.push(data))
      .on("end", async () => {
        try {
          console.log(`📂 Processing ${leads.length} leads from CSV for Bot ${bot_id}...`);

          for (const lead of leads) {
            const phone = lead.phone || lead.wa_number;
            const name = lead.name || lead.wa_name || "Unknown";
            const email = lead.email || "";

            if (!phone) continue;

            // 1. Upsert Lead (✅ Scoped to prevent cross-tenant overwrite)
            await query(
              `INSERT INTO leads (bot_id, wa_number, wa_name, email, source, status)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (wa_number, bot_id) DO UPDATE SET wa_name = $3, email = $4`,
              [bot_id, phone, name, email, 'csv_upload', 'new']
            );
          }

          // 2. If template_id is provided, trigger the campaign logic here
          // (You can call your existing triggerBulkCampaign logic here)

          res.status(200).json({ 
            message: `Successfully processed ${leads.length} leads.`,
            count: leads.length 
          });
        } catch (err) {
          console.error("❌ CSV Processing Error:", err);
          res.status(500).json({ error: "Failed to process CSV data" });
        } finally {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path); // Clean up temp file
        }
      });
  } catch (error: any) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.status(500).json({ error: "Server Error" });
  }
};