import { Router } from "express";
// ✅ Match the names exactly from the controller
import { verifyWebhook, receiveMessage } from "../controllers/webhookController";

const router = Router();

// This handles: GET http://localhost:4000/api/webhook
router.get("/", verifyWebhook);

// This handles: POST http://localhost:4000/api/webhook
router.post("/", receiveMessage);

export default router;