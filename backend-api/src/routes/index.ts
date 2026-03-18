// src/routes/index.ts
import { Router } from "express";
import authRoutes from "./authRoutes";
import botRoutes from "./botRoutes";
import flowRoutes from "./flowRoutes";
import templateRoutes from "./templateRoutes"; 
import leadRoutes from "./leadRoutes";         
import agentRoutes from "./agentRoutes";       
import webhookRoutes from "./webhookRoutes";   
import userRoutes from "./userRoutes"; // ✅ Ensure this path is correct
import { getTemplateLogs } from "../controllers/templateController"; 

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes); // 👈 This was failing because userRoutes was undefined
router.use("/bots", botRoutes);
router.use("/flows", flowRoutes);
router.use("/templates", templateRoutes);
router.use("/leads", leadRoutes);
router.use("/chat", agentRoutes); 
router.use("/webhook", webhookRoutes);

router.get("/template-logs", getTemplateLogs);

export default router;