"use strict";
// backend-api/src/routes/webhookRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhookController_1 = require("../controllers/webhookController");
const router = (0, express_1.Router)();
// 1. Meta Webhook Verification (Universal for WA/FB/IG)
router.get("/", webhookController_1.verifyWebhook);
// 2. Meta Message Receiver (Universal)
// In your vision, we use one webhook URL in Meta Dashboard for all bots.
// The controller will determine the BotID based on Phone ID or Page ID.
router.post("/", webhookController_1.receiveMessage);
exports.default = router;
//# sourceMappingURL=webhookRoutes.js.map