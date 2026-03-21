"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBotStats = getBotStats;
exports.getEvents = getEvents;
const analyticsService_1 = require("../services/analyticsService");
async function getBotStats(req, res, next) {
    try {
        const { botId } = req.params;
        const userId = req.user?.id;
        if (!botId) {
            return res.status(400).json({ error: "botId is required" });
        }
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const data = await (0, analyticsService_1.getBotStatsService)(botId, userId);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function getEvents(req, res, next) {
    try {
        const { botId } = req.params;
        const userId = req.user?.id;
        if (!botId) {
            return res.status(400).json({ error: "botId is required" });
        }
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const data = await (0, analyticsService_1.getEventsService)(botId, userId);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=analyticsController.js.map