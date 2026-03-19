// backend-api/src/controllers/templateController.ts

import { Request, Response } from "express";
import { query } from "../config/db";
import { routeMessage, GenericMessage } from "../services/messageRouter";

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { 
      bot_id, platform_type, name, category, language, 
      header_type, header, body, footer, buttons, variables 
    } = req.body;

    if (!bot_id) return res.status(400).json({ error: "bot_id is required" });

    const result = await query(
      `INSERT INTO templates 
      (bot_id, platform_type, name, category, language, header_type, header, body, footer, buttons, variables, status, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP) RETURNING *`,
      [
        bot_id, platform_type, name, category, language || 'en_US', 
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
    const { platform, bot_id } = req.query;
    if (!bot_id) return res.status(400).json({ error: "bot_id is required" });

    let sql = `SELECT * FROM templates WHERE bot_id = $1`;
    let params: any[] = [bot_id];

    if (platform) {
        sql += ` AND platform_type = $2`;
        params.push(platform);
    }
    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);
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
    const { bot_id, templateId, contactIds, campaignName } = req.body; // Using contactIds instead of leadIds
    const io = req.app.get("io");

    if (!bot_id) return res.status(400).json({ error: "bot_id is required" });

    // 1. Get the template details
    const tplRes = await query(`SELECT * FROM templates WHERE id = $1 AND bot_id = $2`, [templateId, bot_id]);
    if (tplRes.rows.length === 0) return res.status(404).json({ error: "Template not found" });
    const template = tplRes.rows[0];

    // 2. Get the contacts (Phase 1 Refactor)
    const contactsRes = await query(`SELECT * FROM contacts WHERE id = ANY($1) AND bot_id = $2`, [contactIds, bot_id]);
    const contacts = contactsRes.rows;

    let successCount = 0;
    let failCount = 0;

    // 3. Blast the messages via the Centralized Router
    for (const contact of contacts) {
      try {
        const payload: GenericMessage = {
          type: "template",
          templateName: template.name,
          languageCode: template.language,
          text: `[Template: ${template.name}]` // Fallback text for internal logging
        };

        // Attempt to find or create a conversation context for logging
        let convId = null;
        const convRes = await query(`SELECT id FROM conversations WHERE contact_id = $1 AND channel = $2`, [contact.id, template.platform_type]);
        if (convRes.rows[0]) convId = convRes.rows[0].id;

        await routeMessage(
            bot_id,
            convId || contact.id, // Fallback if no active conversation exists
            template.platform_type,
            contact.platform_user_id,
            payload,
            io
        );
        successCount++;
      } catch (err) {
        console.error(`Failed to send to ${contact.platform_user_id}:`, err);
        failCount++;
      }
    }

    // 4. Log the campaign
    await query(
      `INSERT INTO template_logs 
      (bot_id, campaign_name, template_name, platform, total_leads, success_count, fail_count) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [bot_id, campaignName, template.name, template.platform_type, contacts.length, successCount, failCount]
    );

    res.status(200).json({ success: true, successCount, failCount, total: contacts.length });

  } catch (error) {
    console.error("❌ Error launching campaign:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTemplateLogs = async (req: Request, res: Response) => {
  try {
    const { platform, bot_id } = req.query;
    if (!bot_id) return res.status(400).json({ error: "bot_id is required" });

    let sql = `SELECT * FROM template_logs WHERE bot_id = $1`;
    let params: any[] = [bot_id];

    if (platform) {
        sql += ` AND platform = $2`;
        params.push(platform);
    }
    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching logs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};