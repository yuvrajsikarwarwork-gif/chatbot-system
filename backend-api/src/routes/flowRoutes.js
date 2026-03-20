"use strict";
// src/routes/flowRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const flowController_1 = require("../controllers/flowController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
router.get("/bot/:botId", flowController_1.getFlowsByBot);
router.get("/:id", flowController_1.getFlow);
router.post("/", flowController_1.createFlowCtrl);
router.post("/save", flowController_1.saveFlowCtrl);
router.put("/:id", flowController_1.updateFlowCtrl);
router.delete("/:id", flowController_1.deleteFlowCtrl);
exports.default = router;
//# sourceMappingURL=flowRoutes.js.map