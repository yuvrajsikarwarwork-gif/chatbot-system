// src/routes/integrationRoutes.ts

import { Router } from "express";

import {
  getIntegrations,
  getIntegration,
  createIntegrationCtrl,
  updateIntegrationCtrl,
  deleteIntegrationCtrl,
} from "../controllers/integrationController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.get("/bot/:botId", getIntegrations);

router.get("/:id", getIntegration);

router.post("/", createIntegrationCtrl);

router.put("/:id", updateIntegrationCtrl);

router.delete("/:id", deleteIntegrationCtrl);

export default router;