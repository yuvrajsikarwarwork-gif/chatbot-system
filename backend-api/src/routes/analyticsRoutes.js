"use strict";
// src/routes/analyticsRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analyticsController_1 = require("../controllers/analyticsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
router.get("/bot/:botId", analyticsController_1.getBotStats);
router.get("/events/:botId", analyticsController_1.getEvents);
exports.default = router;
//# sourceMappingURL=analyticsRoutes.js.map