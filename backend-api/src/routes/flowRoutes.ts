// src/routes/flowRoutes.ts

import { Router } from "express";

import {
  getFlowsByBot,
  getFlow,
  createFlowCtrl,
  updateFlowCtrl,
  deleteFlowCtrl,
  saveFlowCtrl
} from "../controllers/flowController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.get("/bot/:botId", getFlowsByBot);

router.get("/:id", getFlow);

router.post("/", createFlowCtrl);

router.post("/save", saveFlowCtrl);

router.put("/:id", updateFlowCtrl);

router.delete("/:id", deleteFlowCtrl);

export default router;