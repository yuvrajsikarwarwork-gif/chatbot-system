"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerBulkCampaign = void 0;
const db_1 = require("../config/db");
const templateController_1 = require("./templateController");
const triggerBulkCampaign = async (req, res) => {
    const { campaignName, templateId, leadFilter = {} } = req.body;
    try {
        const tempRes = await (0, db_1.query)(`SELECT * FROM templates WHERE id = $1`, [templateId]);
        if (tempRes.rows.length === 0)
            return res.status(404).json({ error: "Template not found" });
        const template = tempRes.rows[0];
        let leadQuery = `SELECT id FROM leads WHERE bot_id = $1`;
        const params = [template.bot_id];
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
        const leadsRes = await (0, db_1.query)(leadQuery, params);
        req.body = {
            bot_id: template.bot_id,
            templateId,
            campaignName,
            leadIds: leadsRes.rows.map((lead) => lead.id)
        };
        return (0, templateController_1.launchCampaign)(req, res);
    }
    catch (error) {
        console.error("Bulk Send Error:", error);
        res.status(500).json({ error: "Bulk operation failed" });
    }
};
exports.triggerBulkCampaign = triggerBulkCampaign;
//# sourceMappingURL=bulkController.js.map