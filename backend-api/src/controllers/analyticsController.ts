// src/controllers/analyticsController.ts

import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/authMiddleware";

import {
  getBotStatsService,
  getEventsService,
} from "../services/analyticsService";

export async function getBotStats(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await getBotStatsService(
      req.params.botId,
      req.user!.id // ✅ Fixed: user_id -> id
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getEvents(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await getEventsService(
      req.params.botId,
      req.user!.id // ✅ Fixed: user_id -> id
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
}