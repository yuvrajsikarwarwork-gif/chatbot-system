"use strict";
// backend-api/src/routes/integrationRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const integrationController_1 = require("../controllers/integrationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
// ✅ Standardized endpoint for the "Copy-Paste" Integration Form
router.post("/config", authMiddleware_1.botAccessGuard, integrationController_1.saveIntegrationConfig);
// List all integrations for a bot
router.get("/bot/:botId", authMiddleware_1.botAccessGuard, integrationController_1.getIntegrations);
router.delete("/:id", integrationController_1.deleteIntegrationCtrl);
exports.default = router;
//# sourceMappingURL=integrationRoutes.js.map