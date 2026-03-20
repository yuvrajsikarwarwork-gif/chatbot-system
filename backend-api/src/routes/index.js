"use strict";
// src/routes/index.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authRoutes_1 = __importDefault(require("./authRoutes"));
const botRoutes_1 = __importDefault(require("./botRoutes"));
const flowRoutes_1 = __importDefault(require("./flowRoutes"));
const templateRoutes_1 = __importDefault(require("./templateRoutes"));
const leadRoutes_1 = __importDefault(require("./leadRoutes"));
const agentRoutes_1 = __importDefault(require("./agentRoutes"));
const userRoutes_1 = __importDefault(require("./userRoutes"));
const templateController_1 = require("../controllers/templateController");
const router = (0, express_1.Router)();
router.use("/auth", authRoutes_1.default);
router.use("/users", userRoutes_1.default);
router.use("/bots", botRoutes_1.default);
router.use("/flows", flowRoutes_1.default);
router.use("/templates", templateRoutes_1.default);
router.use("/leads", leadRoutes_1.default);
// ✅ existing
router.use("/chat", agentRoutes_1.default);
// ✅ ADD THIS (fix conversations)
router.use("/conversations", agentRoutes_1.default);
router.get("/template-logs", templateController_1.getTemplateLogs);
exports.default = router;
//# sourceMappingURL=index.js.map