import { Router } from "express";
import { 
  getInboxLeads, 
  sendAgentMessage, 
  resumeBotManually,
  getChatHistory 
} from "../controllers/agentController";

const router = Router();

router.get("/leads", getInboxLeads);
router.get("/messages/:wa_number", getChatHistory); // ✅ New History Route
router.post("/send", sendAgentMessage);
router.post("/resume", resumeBotManually); 

export default router;