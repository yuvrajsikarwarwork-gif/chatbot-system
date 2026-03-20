"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchCampaign = exports.getTemplates = void 0;
const db_1 = require("../config/db");
const templateController_1 = require("./templateController");
/**
 * Fetch all available templates from your database (Synced from Meta)
 */
const getTemplates = async (req, res) => {
    try {
        const { botId } = req.params;
        const botRes = await (0, db_1.query)("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [botId, req.user.id]);
        if (!botRes.rows.length)
            return res.status(403).json({ error: "Unauthorized" });
        const result = await (0, db_1.query)("SELECT * FROM templates WHERE bot_id = $1 ORDER BY created_at DESC", [botId]);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getTemplates = getTemplates;
/**
 * Backward-compatible bridge to the conversation-first template launch path
 */
const launchCampaign = async (req, res) => {
    const { botId, campaignName, templateName, leadsIds } = req.body;
    if (!botId || !templateName || !leadsIds || !leadsIds.length) {
        return res.status(400).json({ error: "Bot ID, Template, and Lead IDs are required." });
    }
    const templateRes = await (0, db_1.query)("SELECT id FROM templates WHERE bot_id = $1 AND name = $2 LIMIT 1", [botId, templateName]);
    const templateId = templateRes.rows[0]?.id;
    if (!templateId)
        return res.status(404).json({ error: "Template not found" });
    req.body = {
        bot_id: botId,
        templateId,
        campaignName,
        leadIds: leadsIds
    };
    return (0, templateController_1.launchCampaign)(req, res);
};
exports.launchCampaign = launchCampaign;
//# sourceMappingURL=campaignController.js.map