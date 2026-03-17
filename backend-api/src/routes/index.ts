// src/routes/index.ts
import { Router } from "express";

import authRoutes from "./authRoutes";
import botRoutes from "./botRoutes";
import flowRoutes from "./flowRoutes";
import templateRoutes from "./templateRoutes"; // ✅ Added
import leadRoutes from "./leadRoutes";         // ✅ Added
import agentRoutes from "./agentRoutes";       // ✅ Added (Powers Live Chat)
import webhookRoutes from "./webhookRoutes";   // ✅ Added (Powers WhatsApp)

const router = Router();

router.use("/auth", authRoutes);
router.use("/bots", botRoutes);
router.use("/flows", flowRoutes);
router.use("/templates", templateRoutes);
router.use("/leads", leadRoutes);
router.use("/chat", agentRoutes); 
router.use("/webhook", webhookRoutes);

export default router;