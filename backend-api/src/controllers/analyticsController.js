"use strict";
// src/controllers/analyticsController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBotStats = getBotStats;
exports.getEvents = getEvents;
const analyticsService_1 = require("../services/analyticsService");
async function getBotStats(req, res, next) {
    try {
        const data = await (0, analyticsService_1.getBotStatsService)(req.params.botId, req.user.id // ✅ Fixed: user_id -> id
        );
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function getEvents(req, res, next) {
    try {
        const data = await (0, analyticsService_1.getEventsService)(req.params.botId, req.user.id // ✅ Fixed: user_id -> id
        );
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=analyticsController.js.map