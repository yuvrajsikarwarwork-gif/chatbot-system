import { Request, Response } from "express";
import { query } from "../config/db";
import { launchCampaign as launchTemplateCampaign } from "./templateController";

export const triggerBulkCampaign = async (req: Request, res: Response) => {
  const { campaignName, templateId, leadFilter = {} } = req.body;

  try {
    const tempRes = await query(`SELECT * FROM templates WHERE id = $1`, [templateId]);
    if (tempRes.rows.length === 0) return res.status(404).json({ error: "Template not found" });
    const template = tempRes.rows[0];

    let leadQuery = `SELECT id FROM leads WHERE bot_id = $1`;
    const params: any[] = [template.bot_id];

    if (leadFilter.status) {
      params.push(leadFilter.status);
      leadQuery += ` AND status = $${params.length}`;
    }
    if (leadFilter.source) {
      params.push(leadFilter.source);
      leadQuery += ` AND source = $${params.length}`;
    }
    if (leadFilter.id) {
      params.push(leadFilter.id);
      leadQuery += ` AND id = $${params.length}`;
    }

    const leadsRes = await query(leadQuery, params);

    req.body = {
      bot_id: template.bot_id,
      templateId,
      campaignName,
      leadIds: leadsRes.rows.map((lead: any) => lead.id)
    };

    return launchTemplateCampaign(req, res);
  } catch (error) {
    console.error("Bulk Send Error:", error);
    res.status(500).json({ error: "Bulk operation failed" });
  }
};
