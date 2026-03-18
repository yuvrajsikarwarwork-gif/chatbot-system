import { Router } from "express";
import { 
  getTickets, 
  createTicket, 
  closeTicket, 
  replyToTicket 
} from "../controllers/agentController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// ✅ Use authMiddleware to protect all agent routes
router.use(authMiddleware);

// ✅ Routes updated to match controller exports
router.get("/tickets/:botId", getTickets);
router.post("/tickets", createTicket);
router.post("/tickets/:ticketId/close", closeTicket);
router.post("/tickets/:ticketId/reply", replyToTicket);

export default router;