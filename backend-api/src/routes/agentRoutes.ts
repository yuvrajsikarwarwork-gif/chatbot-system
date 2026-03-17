// src/routes/agentRoutes.ts

import { Router } from "express";

import {
  createTicketCtrl,
  getTicketsCtrl,
  closeTicketCtrl,
  replyTicketCtrl,
} from "../controllers/agentController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.post("/ticket", createTicketCtrl);

router.get("/bot/:botId", getTicketsCtrl);

router.post("/close/:id", closeTicketCtrl);

router.post("/reply/:id", replyTicketCtrl);

export default router;