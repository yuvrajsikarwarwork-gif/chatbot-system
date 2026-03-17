// src/routes/index.ts

import { Router } from "express";

import authRoutes from "./authRoutes";
import botRoutes from "./botRoutes";
import flowRoutes from "./flowRoutes"; // ✅ Flow routes successfully imported

// import integrationRoutes from "./integrationRoutes";
// import messageRoutes from "./messageRoutes";
// import conversationRoutes from "./conversationRoutes";
// import analyticsRoutes from "./analyticsRoutes";
// import agentRoutes from "./agentRoutes";
// import queueRoutes from "./queueRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/bots", botRoutes);
router.use("/flows", flowRoutes); // ✅ Flow routes successfully mounted

// router.use("/integrations", integrationRoutes);
// router.use("/messages", messageRoutes);
// router.use("/conversations", conversationRoutes);
// router.use("/analytics", analyticsRoutes);
// router.use("/agents", agentRoutes);
// router.use("/queue", queueRoutes);

export default router;