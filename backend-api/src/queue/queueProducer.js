"use strict";
// src/queue/queueProducer.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushToQueue = pushToQueue;
const redisClient_1 = require("./redisClient");
const QUEUE_NAME = "message-processing";
async function pushToQueue(job) {
    await redisClient_1.redis.lpush(QUEUE_NAME, JSON.stringify(job));
}
//# sourceMappingURL=queueProducer.js.map