import { Router } from "express";
import { 
  getInboxLeads, 
  sendAgentMessage, 
  resumeBotManually 
} from "../controllers/agentController";

const router = Router();

// These endpoints will be prefixed with /api/chat (from your index.ts)
router.get("/leads", getInboxLeads);
router.post("/send", sendAgentMessage);
router.post("/toggle-bot", resumeBotManually);

export default router;