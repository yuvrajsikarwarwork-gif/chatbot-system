// src/routes/conversationRoutes.ts

import { Router } from "express";

import {
  getConversations,
  getConversation,
  getMessages,
} from "../controllers/conversationController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.get("/bot/:botId", getConversations);

router.get("/:id", getConversation);

router.get("/:id/messages", getMessages);

export default router;