"use strict";
// src/controllers/integrationController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveIntegrationConfig = saveIntegrationConfig;
exports.getIntegrations = getIntegrations;
exports.getIntegration = getIntegration;
exports.createIntegrationCtrl = createIntegrationCtrl;
exports.updateIntegrationCtrl = updateIntegrationCtrl;
exports.deleteIntegrationCtrl = deleteIntegrationCtrl;
const integrationService_1 = require("../services/integrationService");
async function saveIntegrationConfig(req, res, next) {
    try {
        const { botId, platform, config } = req.body;
        // 1. Verify user is assigned as 'admin' to this bot
        const assignmentCheck = await query("SELECT role FROM bot_assignments WHERE bot_id = $1 AND user_id = $2", [botId, req.user.id]);
        const isOwner = await query("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [botId, req.user.id]);
        if (!isOwner.rows.length && assignmentCheck.rows[0]?.role !== 'admin') {
            return res.status(403).json({ error: "Insufficient permissions to manage integrations" });
        }
        // 2. Insert or Update configuration
        const result = await query(`INSERT INTO integrations (id, bot_id, platform, config, status)
       VALUES (gen_random_uuid(), $1, $2, $3, 'connected')
       ON CONFLICT (bot_id, platform) 
       DO UPDATE SET config = $3, status = 'connected', updated_at = NOW()
       RETURNING id, platform, status, updated_at`, [botId, platform, JSON.stringify(config)]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        next(err);
    }
}
// Keep existing methods for listing/deleting below...
async function getIntegrations(req, res, next) {
    try {
        const data = await (0, integrationService_1.getIntegrationsService)(req.params.botId, req.user.id // Fixed: user_id -> id
        );
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function getIntegration(req, res, next) {
    try {
        const data = await (0, integrationService_1.getIntegrationService)(req.params.id, req.user.id // Fixed: user_id -> id
        );
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function createIntegrationCtrl(req, res, next) {
    try {
        const data = await (0, integrationService_1.createIntegrationService)(req.body.bot_id, req.user.id, // Fixed: user_id -> id
        req.body.type, req.body.config_json);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function updateIntegrationCtrl(req, res, next) {
    try {
        const data = await (0, integrationService_1.updateIntegrationService)(req.params.id, req.user.id, // Fixed: user_id -> id
        req.body.config_json);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function deleteIntegrationCtrl(req, res, next) {
    try {
        await (0, integrationService_1.deleteIntegrationService)(req.params.id, req.user.id // Fixed: user_id -> id
        );
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=integrationController.js.map