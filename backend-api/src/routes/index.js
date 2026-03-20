"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/index.ts
const express_1 = require("express");
const authRoutes_1 = __importDefault(require("./authRoutes"));
const botRoutes_1 = __importDefault(require("./botRoutes"));
const flowRoutes_1 = __importDefault(require("./flowRoutes"));
const templateRoutes_1 = __importDefault(require("./templateRoutes"));
const leadRoutes_1 = __importDefault(require("./leadRoutes"));
const agentRoutes_1 = __importDefault(require("./agentRoutes"));
const webhookRoutes_1 = __importDefault(require("./webhookRoutes"));
const userRoutes_1 = __importDefault(require("./userRoutes")); // ✅ Ensure this path is correct
const templateController_1 = require("../controllers/templateController");
const router = (0, express_1.Router)();
router.use("/auth", authRoutes_1.default);
router.use("/users", userRoutes_1.default); // 👈 This was failing because userRoutes was undefined
router.use("/bots", botRoutes_1.default);
router.use("/flows", flowRoutes_1.default);
router.use("/templates", templateRoutes_1.default);
router.use("/leads", leadRoutes_1.default);
router.use("/chat", agentRoutes_1.default);
router.use("/webhook", webhookRoutes_1.default);
router.get("/template-logs", templateController_1.getTemplateLogs);
exports.default = router;
//# sourceMappingURL=index.js.map