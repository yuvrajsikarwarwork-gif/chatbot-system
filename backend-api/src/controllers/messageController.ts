// src/controllers/messageController.ts

import { Request, Response, NextFunction } from "express";

import {
  incomingMessageService,
} from "../services/messageService";

export async function incomingMessage(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      bot_id,
      channel,
      external_user_id,
      message,
    } = req.body;

    const data = await incomingMessageService(
      bot_id,
      channel,
      external_user_id,
      message
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
}