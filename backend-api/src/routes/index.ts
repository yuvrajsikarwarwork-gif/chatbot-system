// src/routes/index.ts
import { Router } from "express";

import authRoutes from "./authRoutes";
import botRoutes from "./botRoutes";
import flowRoutes from "./flowRoutes";
import templateRoutes from "./templateRoutes"; 
import leadRoutes from "./leadRoutes";         
import agentRoutes from "./agentRoutes";       
import webhookRoutes from "./webhookRoutes";   

// ✅ Import the log fetcher directly from the controller
import { getTemplateLogs } from "../controllers/templateController"; 

const router = Router();

router.use("/auth", authRoutes);
router.use("/bots", botRoutes);
router.use("/flows", flowRoutes);
router.use("/templates", templateRoutes);
router.use("/leads", leadRoutes);
router.use("/chat", agentRoutes); 
router.use("/webhook", webhookRoutes);

// ✅ Add the logs route here so it exactly matches your frontend's call to `/template-logs`
router.get("/template-logs", getTemplateLogs);

export default router;