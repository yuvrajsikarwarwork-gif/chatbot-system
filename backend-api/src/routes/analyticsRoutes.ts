// src/routes/analyticsRoutes.ts

import { Router } from "express";

import {
  getBotStats,
  getEvents,
} from "../controllers/analyticsController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.get("/bot/:botId", getBotStats);

router.get("/events/:botId", getEvents);

export default router;