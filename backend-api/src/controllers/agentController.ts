// src/controllers/agentController.ts

import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/authMiddleware";

import {
  createTicketService,
  getTicketsService,
  closeTicketService,
  replyTicketService,
} from "../services/agentService";

export async function createTicketCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data =
      await createTicketService(
        req.body.conversation_id,
        req.user.user_id
      );

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getTicketsCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data =
      await getTicketsService(
        req.params.botId,
        req.user.user_id
      );

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function closeTicketCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data =
      await closeTicketService(
        req.params.id,
        req.user.user_id
      );

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function replyTicketCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data =
      await replyTicketService(
        req.params.id,
        req.user.user_id,
        req.body.message
      );

    res.json(data);
  } catch (err) {
    next(err);
  }
}