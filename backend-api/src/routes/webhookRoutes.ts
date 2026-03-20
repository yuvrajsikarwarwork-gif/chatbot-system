import { Router } from "express";
import { verifyWebhook, receiveMessage } from "../controllers/webhookController";

const router = Router();

// 1. Meta Webhook Verification (Universal for WA/FB/IG)
// Resolves to GET /api/webhook
router.get("/", verifyWebhook);

// 2. Meta Message Receiver (Universal)
// Resolves to POST /api/webhook
router.post("/", receiveMessage);

export default router;