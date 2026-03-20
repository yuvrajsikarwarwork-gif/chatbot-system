"use strict";
// backend-api/src/routes/conversationRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const conversationController_1 = require("../controllers/conversationController");
const router = (0, express_1.Router)();
// Secure all conversation routes
router.use(authMiddleware_1.authMiddleware);
// Get all active conversations for a specific bot
router.get("/bot/:botId", conversationController_1.getConversations);
// Get specific conversation details
router.get("/:id", conversationController_1.getConversation);
// Get message history for a conversation
router.get("/:id/messages", conversationController_1.getMessages);
// Update status (e.g., agent taking over, or closing ticket)
router.put("/:id/status", conversationController_1.updateConversationStatus);
exports.default = router;
//# sourceMappingURL=conversationRoutes.js.map