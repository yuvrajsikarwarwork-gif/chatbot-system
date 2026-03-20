"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const templateController_1 = require("../controllers/templateController");
const router = (0, express_1.Router)();
router.post("/launch-campaign", templateController_1.launchCampaign);
router.get("/", templateController_1.getTemplates);
router.post("/", templateController_1.createTemplate);
router.put("/:id", templateController_1.updateTemplate);
router.delete("/:id", templateController_1.deleteTemplate);
router.post("/approve/:id", templateController_1.approveTemplate);
exports.default = router;
//# sourceMappingURL=templateRoutes.js.map