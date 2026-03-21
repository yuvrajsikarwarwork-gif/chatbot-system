"use strict";
// src/controllers/integrationController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveIntegrationConfig = saveIntegrationConfig;
exports.getIntegrations = getIntegrations;
exports.getIntegration = getIntegration;
exports.createIntegrationCtrl = createIntegrationCtrl;
exports.updateIntegrationCtrl = updateIntegrationCtrl;
exports.deleteIntegrationCtrl = deleteIntegrationCtrl;
const db_1 = require("../config/db");
const integrationService_1 = require("../services/integrationService");
async function saveIntegrationConfig(req, res, next) {
    try {
        const { botId, platform, config } = req.body;
        const userId = req.user?.id;
        if (!botId || !platform) {
            return res.status(400).json({ error: "botId and platform are required" });
        }
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // 1. Verify user is assigned as 'admin' to this bot
        const assignmentCheck = await (0, db_1.query)("SELECT role FROM bot_assignments WHERE bot_id = $1 AND user_id = $2", [botId, userId]);
        const isOwner = await (0, db_1.query)("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [botId, userId]);
        if (!isOwner.rows.length && assignmentCheck.rows[0]?.role !== 'admin') {
            return res.status(403).json({ error: "Insufficient permissions to manage integrations" });
        }
        // 2. Insert or Update configuration
        const result = await (0, db_1.query)(`INSERT INTO integrations (id, bot_id, platform, config, status)
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
        const { botId } = req.params;
        const userId = req.user?.id;
        if (!botId)
            return res.status(400).json({ error: "botId is required" });
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const data = await (0, integrationService_1.getIntegrationsService)(botId, userId);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function getIntegration(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!id)
            return res.status(400).json({ error: "id is required" });
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const data = await (0, integrationService_1.getIntegrationService)(id, userId);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function createIntegrationCtrl(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!req.body.bot_id)
            return res.status(400).json({ error: "bot_id is required" });
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const data = await (0, integrationService_1.createIntegrationService)(req.body.bot_id, userId, req.body.type, req.body.config_json);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function updateIntegrationCtrl(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!id)
            return res.status(400).json({ error: "id is required" });
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const data = await (0, integrationService_1.updateIntegrationService)(id, userId, req.body.config_json);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function deleteIntegrationCtrl(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!id)
            return res.status(400).json({ error: "id is required" });
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        await (0, integrationService_1.deleteIntegrationService)(id, userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=integrationController.js.map