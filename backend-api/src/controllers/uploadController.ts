import { Request, Response } from "express";
import { query } from "../config/db";
import csv from "csv-parser";
import fs from "fs";

export const uploadLeadsCSV = async (req: Request, res: Response) => {
  const { bot_id, template_id, campaign_name } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "No file uploaded" });

  const leads: any[] = [];

  // Parse CSV file
  fs.createReadStream(file.path)
    .pipe(csv())
    .on("data", (data) => leads.push(data))
    .on("end", async () => {
      try {
        console.log(`📂 Processing ${leads.length} leads from CSV...`);

        for (const lead of leads) {
          const phone = lead.phone || lead.wa_number;
          const name = lead.name || lead.wa_name || "Unknown";
          const email = lead.email || "";

          // 1. Upsert Lead (Insert or Update if exists)
          await query(
            `INSERT INTO leads (bot_id, wa_number, wa_name, email, source, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (wa_number) DO UPDATE SET wa_name = $3, email = $4`,
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
        fs.unlinkSync(file.path); // Clean up temp file
      }
    });
};