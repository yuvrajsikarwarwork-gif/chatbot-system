import { Request, Response } from "express";
import { query } from "../config/db";
import axios from "axios";

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { 
      platform_type, name, category, language, 
      header_type, header, body, footer, buttons, variables 
    } = req.body;

    const result = await query(
      `INSERT INTO templates 
      (platform_type, name, category, language, header_type, header, body, footer, buttons, variables, status, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP) RETURNING *`,
      [
        platform_type, name, category, language || 'en_US', 
        header_type || 'text', header, body, footer, 
        JSON.stringify(buttons || []), JSON.stringify(variables || {}), 'pending' 
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error creating template:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const { platform } = req.query;
    const result = platform 
      ? await query(`SELECT * FROM templates WHERE platform_type = $1 ORDER BY created_at DESC`, [platform])
      : await query(`SELECT * FROM templates ORDER BY created_at DESC`);
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching templates:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { header_type, header, body, footer, buttons, variables } = req.body;

    const checkRes = await query(`SELECT status FROM templates WHERE id = $1`, [id]);
    if (checkRes.rows.length === 0) return res.status(404).json({ error: "Template not found" });
    
    if (checkRes.rows[0].status === 'approved') {
      return res.status(403).json({ error: "Approved templates cannot be edited." });
    }

    const result = await query(
      `UPDATE templates SET 
        header_type = $1, header = $2, body = $3, footer = $4, 
        buttons = $5, variables = $6, updated_at = CURRENT_TIMESTAMP, status = 'pending'
      WHERE id = $7 RETURNING *`,
      [header_type, header, body, footer, JSON.stringify(buttons), JSON.stringify(variables), id]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const approveTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejected_reason } = req.body;
    const result = await query(
      `UPDATE templates SET status = $1, rejected_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [status, rejected_reason || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Template not found" });
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM templates WHERE id = $1`, [id]);
    res.status(200).json({ message: "Template deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const launchCampaign = async (req: Request, res: Response) => {
  try {
    const { templateId, leadIds, campaignName } = req.body;
    const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
    const PHONE_ID = process.env.PHONE_NUMBER_ID || "1030050193525162";

    // 1. Get the template details
    const tplRes = await query(`SELECT * FROM templates WHERE id = $1`, [templateId]);
    if (tplRes.rows.length === 0) return res.status(404).json({ error: "Template not found" });
    const template = tplRes.rows[0];

    // 2. Get the leads
    const leadsRes = await query(`SELECT * FROM leads WHERE id = ANY($1)`, [leadIds]);
    const leads = leadsRes.rows;

    let successCount = 0;
    let failCount = 0;

    // 3. Blast the messages
    for (const lead of leads) {
      try {
        await axios({
          method: "POST",
          url: `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`,
          data: {
            messaging_product: "whatsapp",
            to: lead.wa_number,
            type: "template",
            template: {
              name: template.name,
              language: { code: template.language }
            }
          },
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to send to ${lead.wa_number}:`, err);
        failCount++;
      }
    }

    // 4. Log the campaign to the database
    await query(
      `INSERT INTO template_logs 
      (campaign_name, template_name, platform, total_leads, success_count, fail_count) 
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [campaignName, template.name, 'whatsapp', leads.length, successCount, failCount]
    );

    res.status(200).json({ success: true, successCount, failCount, total: leads.length });

  } catch (error) {
    console.error("❌ Error launching campaign:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTemplateLogs = async (req: Request, res: Response) => {
  try {
    const { platform } = req.query;
    const result = platform 
      ? await query(`SELECT * FROM template_logs WHERE platform = $1 ORDER BY created_at DESC`, [platform])
      : await query(`SELECT * FROM template_logs ORDER BY created_at DESC`);
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching logs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};