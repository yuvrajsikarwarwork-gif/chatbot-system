"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlowsByBot = getFlowsByBot;
exports.getFlow = getFlow;
exports.saveFlowCtrl = saveFlowCtrl;
exports.createFlowCtrl = createFlowCtrl;
exports.updateFlowCtrl = updateFlowCtrl;
exports.deleteFlowCtrl = deleteFlowCtrl;
const flowService_1 = require("../services/flowService");
async function getFlowsByBot(req, res, next) {
    try {
        const { botId } = req.params;
        const userId = req.user?.id;
        if (!botId || botId === "undefined")
            return res.status(200).json({ nodes: [], edges: [] });
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const data = await (0, flowService_1.getFlowsByBotService)(botId, userId);
        if (!data || (Array.isArray(data) && data.length === 0)) {
            return res.status(200).json({ nodes: [], edges: [] });
        }
        res.json(Array.isArray(data) ? data[0] : data);
    }
    catch (err) {
        res.status(200).json({ nodes: [], edges: [] });
    }
}
async function getFlow(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!id)
            return res.status(400).json({ error: "id is required" });
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const data = await (0, flowService_1.getFlowService)(id, userId);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
/**
 * BULLETPROOF SAVE LOGIC
 * Extracts parameters and validates them before hitting the database.
 */
async function saveFlowCtrl(req, res, next) {
    try {
        const botId = req.body.botId || req.body.bot_id;
        const flowJson = req.body.flow_json;
        const userId = req.user?.id;
        // Safety guards to prevent 500 crash
        if (!botId)
            return res.status(400).json({ error: "botId is missing in request." });
        if (!flowJson)
            return res.status(400).json({ error: "flow_json payload is missing." });
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const data = await (0, flowService_1.saveFlowService)(botId, userId, flowJson);
        res.status(200).json(data);
    }
    catch (err) {
        console.error("❌ saveFlowCtrl Critical Error:", err);
        next(err);
    }
}
async function createFlowCtrl(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!req.body.bot_id)
            return res.status(400).json({ error: "bot_id is required" });
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const data = await (0, flowService_1.saveFlowService)(req.body.bot_id, userId, req.body.flow_json);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function updateFlowCtrl(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!id)
            return res.status(400).json({ error: "id is required" });
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const data = await (0, flowService_1.updateFlowService)(id, userId, req.body.flow_json);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function deleteFlowCtrl(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!id)
            return res.status(400).json({ error: "id is required" });
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        await (0, flowService_1.deleteFlowService)(id, userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=flowController.js.map