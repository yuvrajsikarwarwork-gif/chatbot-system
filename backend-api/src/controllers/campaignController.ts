import { Request, Response } from "express";
import { query } from "../config/db";
import { sendWhatsAppMessage } from "../services/whatsappService";
// import { sendTelegramMessage } from "../services/telegramService"; // Placeholder for future platforms

export const triggerBulkCampaign = async (req: Request, res: Response) => {
  const { templateId, leadFilter, campaignName } = req.body;

  try {
    // 1. Fetch Template Details
    const tempRes = await query(`SELECT * FROM templates WHERE id = $1`, [templateId]);
    if (tempRes.rows.length === 0) return res.status(404).json({ error: "Template not found" });
    const template = tempRes.rows[0];

    // 2. Create Campaign Entry
    const campRes = await query(
      `INSERT INTO campaigns (name, platform_type, template_id, lead_filter, status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [campaignName, template.platform_type, templateId, JSON.stringify(leadFilter), 'running']
    );
    const campaignId = campRes.rows[0].id;

    // 3. Fetch Target Leads based on filter (e.g., status or source)
    let leadQuery = `SELECT * FROM leads WHERE 1=1`;
    const queryParams: any[] = [];
    
    if (leadFilter.status) {
      queryParams.push(leadFilter.status);
      leadQuery += ` AND status = $${queryParams.length}`;
    }

    const leadsRes = await query(leadQuery, queryParams);
    const leads = leadsRes.rows;

    // 4. Start Background Processing (Non-blocking)
    processCampaign(campaignId, template, leads);

    res.status(200).json({ 
      message: `Campaign started for ${leads.length} leads.`, 
      campaignId 
    });

  } catch (error) {
    console.error("❌ Campaign Trigger Error:", error);
    res.status(500).json({ error: "Failed to trigger campaign" });
  }
};

const processCampaign = async (campaignId: string, template: any, leads: any[]) => {
  for (const lead of leads) {
    try {
      // Logic: Replace {{1}}, {{2}} with lead data based on template mapping
      let personalizedBody = template.body;
      const varMapping = template.buttons; // Assuming mapping is stored here or in a specific field

      // Simple replacement logic for {{n}}
      personalizedBody = personalizedBody.replace(/{{1}}/g, lead.wa_name || "User");
      personalizedBody = personalizedBody.replace(/{{2}}/g, lead.wa_number || "");

      let messageId = null;

      // 5. Route to correct platform
      if (template.platform_type === 'whatsapp') {
        // Fetch bot/platform credentials
        const botRes = await query(`SELECT wa_phone_number_id, wa_access_token FROM bots WHERE id = $1`, [lead.bot_id]);
        if (botRes.rows.length > 0) {
          const { wa_phone_number_id, wa_access_token } = botRes.rows[0];
          // We use existing service but could extend to sendTemplateMessage specifically
          const response: any = await sendWhatsAppMessage(wa_phone_number_id, wa_access_token, lead.wa_number, personalizedBody);
          messageId = response.data?.messages?.[0]?.id;
        }
      }

      // 6. Log the attempt
      await query(
        `INSERT INTO template_logs (platform_type, template_id, lead_id, campaign_id, provider_message_id, phone, status, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [template.platform_type, template.id, lead.id, campaignId, messageId, lead.wa_number, messageId ? 'sent' : 'failed']
      );

    } catch (err) {
      console.error(`❌ Failed to send to lead ${lead.id}:`, err);
    }
  }

  // Final Update
  await query(`UPDATE campaigns SET status = 'done' WHERE id = $1`, [campaignId]);
};