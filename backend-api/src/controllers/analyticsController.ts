import { NextFunction, Response } from "express";

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
    const { botId } = req.params;
    const userId = req.user?.id;

    if (!botId) {
      return res.status(400).json({ error: "botId is required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = await getBotStatsService(botId, userId);
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
    const { botId } = req.params;
    const userId = req.user?.id;

    if (!botId) {
      return res.status(400).json({ error: "botId is required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = await getEventsService(botId, userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
