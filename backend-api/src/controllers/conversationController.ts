// src/controllers/conversationController.ts

import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/authMiddleware";

import {
  getConversationsService,
  getConversationService,
  getConversationMessagesService,
} from "../services/conversationService";

export async function getConversations(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await getConversationsService(
      req.params.botId,
      req.user!.id // Fixed: user_id -> id
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getConversation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await getConversationService(
      req.params.id,
      req.user!.id // Fixed: user_id -> id
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getMessages(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await getConversationMessagesService(
      req.params.id,
      req.user!.id // Fixed: user_id -> id
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
}