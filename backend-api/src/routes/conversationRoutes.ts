// backend-api/src/routes/conversationRoutes.ts

import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getConversations,
  getConversation,
  getMessages,
  updateConversationStatus
} from "../controllers/conversationController";

const router = Router();

// Secure all conversation routes
router.use(authMiddleware);

// Get all active conversations for a specific bot
router.get("/bot/:botId", getConversations);

// Get specific conversation details
router.get("/:id", getConversation);

// Get message history for a conversation
router.get("/:id/messages", getMessages);

// Update status (e.g., agent taking over, or closing ticket)
router.put("/:id/status", updateConversationStatus);

export default router;