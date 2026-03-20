"use strict";
// src/services/queueService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.addJob = addJob;
const queueJobModel_1 = require("../models/queueJobModel");
const queueProducer_1 = require("../queue/queueProducer");
const botModel_1 = require("../models/botModel");
async function addJob(botId, userId, job) {
    // ✅ MULTI-TENANCY: Strict Gateway check before queuing asynchronous tasks
    const bot = await (0, botModel_1.findBotById)(botId);
    if (!bot || bot.user_id !== userId) {
        throw { status: 403, message: "Unauthorized to queue jobs for this bot" };
    }
    // ✅ INJECT SECURITY CONTEXT: Force the verified botId into the payload 
    // so the worker process cannot execute against the wrong tenant.
    const securedPayload = {
        ...job.payload,
        botId: bot.id
    };
    const dbJob = await (0, queueJobModel_1.createJob)(job.type, securedPayload);
    await (0, queueProducer_1.pushToQueue)({
        id: dbJob.id,
        type: job.type,
        payload: securedPayload,
    });
    return dbJob;
}
//# sourceMappingURL=queueService.js.map