"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const botController_1 = require("../controllers/botController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
/**
 * All bot routes are protected by authMiddleware.
 * This ensures req.user is populated for the controllers.
 */
router.use(authMiddleware_1.authMiddleware);
router.get("/", botController_1.getBots);
router.get("/:id", botController_1.getBot);
router.post("/", botController_1.createBotCtrl);
router.put("/:id", botController_1.updateBotCtrl); // Unified update handler
router.delete("/:id", botController_1.deleteBotCtrl);
router.post("/:id/activate", botController_1.activateBotCtrl);
exports.default = router;
//# sourceMappingURL=botRoutes.js.map