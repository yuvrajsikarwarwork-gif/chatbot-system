"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhookController_1 = require("../controllers/webhookController");
const router = (0, express_1.Router)();
// 1. Meta Webhook Verification (Universal for WA/FB/IG)
// Resolves to GET /api/webhook
router.get("/", webhookController_1.verifyWebhook);
// 2. Meta Message Receiver (Universal)
// Resolves to POST /api/webhook
router.post("/", webhookController_1.receiveMessage);
exports.default = router;
//# sourceMappingURL=webhookRoutes.js.map