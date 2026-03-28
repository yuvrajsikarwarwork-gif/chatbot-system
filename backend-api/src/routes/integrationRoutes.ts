import { Router } from "express";

import {
  completeMetaEmbeddedSignupCtrl,
  createMetaEmbeddedSignupSessionCtrl,
  deleteIntegrationCtrl,
  generateConnectionDetailsCtrl,
  getIntegrations,
  handleMetaEmbeddedSignupCallbackCtrl,
  updateIntegrationCtrl,
} from "../controllers/integrationController";
import { authMiddleware, botAccessGuard } from "../middleware/authMiddleware";

const router = Router();

router.get("/meta/callback", handleMetaEmbeddedSignupCallbackCtrl);

router.use(authMiddleware);

router.post(
  "/generate-connection-details",
  botAccessGuard,
  generateConnectionDetailsCtrl
);
router.post("/meta/signup-session", botAccessGuard, createMetaEmbeddedSignupSessionCtrl);
router.post("/meta/complete", completeMetaEmbeddedSignupCtrl);
router.get("/bot/:botId", botAccessGuard, getIntegrations);
router.put("/:id", updateIntegrationCtrl);
router.delete("/:id", deleteIntegrationCtrl);

export default router;
