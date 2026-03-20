"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerBulkCampaign = void 0;
const db_1 = require("../config/db");
const whatsappService_1 = require("../services/whatsappService");
const triggerBulkCampaign = async (req, res) => {
    const { campaignName, templateId, leadFilter } = req.body;
    try {
        // 1. Get Template & Mapping
        const tempRes = await (0, db_1.query)(`SELECT * FROM templates WHERE id = $1`, [templateId]);
        if (tempRes.rows.length === 0)
            return res.status(404).json({ error: "Template not found" });
        const template = tempRes.rows[0];
        // 2. Fetch Targeted Leads
        let leadQuery = `SELECT * FROM leads WHERE 1=1`;
        const params = [];
        if (leadFilter.status) {
            params.push(leadFilter.status);
            leadQuery += ` AND status = $${params.length}`;
        }
        if (leadFilter.source) {
            params.push(leadFilter.source);
            leadQuery += ` AND source = $${params.length}`;
        }
        const leadsRes = await (0, db_1.query)(leadQuery, params);
        const leads = leadsRes.rows;
        // 3. Register Campaign
        const campRes = await (0, db_1.query)(`INSERT INTO campaigns (name, platform_type, template_id, status) VALUES ($1, $2, $3, $4) RETURNING id`, [campaignName, template.platform_type, templateId, 'running']);
        const campaignId = campRes.rows[0].id;
        // 4. Background Execution
        executeCampaign(campaignId, template, leads);
        res.status(200).json({ success: true, count: leads.length, campaignId });
    }
    catch (error) {
        console.error("Bulk Send Error:", error);
        res.status(500).json({ error: "Bulk operation failed" });
    }
};
exports.triggerBulkCampaign = triggerBulkCampaign;
const executeCampaign = async (campaignId, template, leads) => {
    for (const lead of leads) {
        try {
            // PERSONALIZATION LOGIC
            // Maps {{1}}, {{2}} based on the template's 'variables' JSON mapping
            let personalizedBody = template.body;
            const mappings = template.variables || {}; // e.g., {"{{1}}": "name"}
            Object.entries(mappings).forEach(([tag, field]) => {
                const value = lead[field] || "";
                personalizedBody = personalizedBody.replace(new RegExp(tag, 'g'), value);
            });
            let providerId = null;
            // PLATFORM ROUTING
            if (template.platform_type === 'whatsapp') {
                const bot = await (0, db_1.query)(`SELECT wa_phone_number_id, wa_access_token FROM bots WHERE id = $1`, [lead.bot_id]);
                if (bot.rows[0]) {
                    const { wa_phone_number_id, wa_access_token } = bot.rows[0];
                    // Replace with your Template-specific API call if using Meta Templates
                    const metaRes = await (0, whatsappService_1.sendWhatsAppMessage)(wa_phone_number_id, wa_access_token, lead.wa_number, personalizedBody);
                    providerId = metaRes.data?.messages?.[0]?.id;
                }
            }
            // LOGGING
            await (0, db_1.query)(`INSERT INTO template_logs (platform_type, template_id, lead_id, campaign_id, provider_message_id, phone, status, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`, [template.platform_type, template.id, lead.id, campaignId, providerId, lead.wa_number, providerId ? 'sent' : 'failed']);
            // DELAY to avoid API rate limits (e.g., 100ms per message)
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        catch (err) {
            console.error(`Failed for lead ${lead.id}:`, err);
        }
    }
    await (0, db_1.query)(`UPDATE campaigns SET status = 'done' WHERE id = $1`, [campaignId]);
};
//# sourceMappingURL=bulkController.js.map