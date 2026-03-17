// src/routes/messageRoutes.ts

import { Router } from "express";

import {
  incomingMessage,
} from "../controllers/messageController";

const router = Router();

router.post("/incoming", incomingMessage);

export default router;