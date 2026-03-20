import { Response } from "express";
import { query } from "../config/db";
import { AuthRequest } from "../middleware/authMiddleware";
import { launchCampaign as launchTemplateCampaign } from "./templateController";

/**
 * Fetch all available templates from your database (Synced from Meta)
 */
export const getTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const { botId } = req.params;

    const botRes = await query("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [botId, req.user!.id]);
    if (!botRes.rows.length) return res.status(403).json({ error: "Unauthorized" });

    const result = await query("SELECT * FROM templates WHERE bot_id = $1 ORDER BY created_at DESC", [botId]);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Backward-compatible bridge to the conversation-first template launch path
 */
export const launchCampaign = async (req: AuthRequest, res: Response) => {
  const { botId, campaignName, templateName, leadsIds } = req.body;

  if (!botId || !templateName || !leadsIds || !leadsIds.length) {
    return res.status(400).json({ error: "Bot ID, Template, and Lead IDs are required." });
  }

  const templateRes = await query(
    "SELECT id FROM templates WHERE bot_id = $1 AND name = $2 LIMIT 1",
    [botId, templateName]
  );
  const templateId = templateRes.rows[0]?.id;
  if (!templateId) return res.status(404).json({ error: "Template not found" });

  req.body = {
    bot_id: botId,
    templateId,
    campaignName,
    leadIds: leadsIds
  };

  return launchTemplateCampaign(req, res);
};
