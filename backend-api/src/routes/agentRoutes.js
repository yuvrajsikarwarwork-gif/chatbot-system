"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const agentController_1 = require("../controllers/agentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// ✅ Use authMiddleware to protect all agent routes
router.use(authMiddleware_1.authMiddleware);
// ✅ Existing Ticket Routes
router.get("/tickets/:botId", agentController_1.getTickets);
router.post("/tickets", agentController_1.createTicket);
router.post("/tickets/:ticketId/close", agentController_1.closeTicket);
router.post("/tickets/:ticketId/reply", agentController_1.replyToTicket);
// ✅ New Unified Inbox Routes (Phase D)
router.get("/conversations/:conversationId", agentController_1.getConversationDetail);
router.post("/conversations/:conversationId/reply", agentController_1.sendAgentReply);
exports.default = router;
//# sourceMappingURL=agentRoutes.js.map