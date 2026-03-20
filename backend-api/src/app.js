"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes"));
const botRoutes_1 = __importDefault(require("./routes/botRoutes"));
const webhookRoutes_1 = __importDefault(require("./routes/webhookRoutes"));
const flowRoutes_1 = __importDefault(require("./routes/flowRoutes"));
const leadRoutes_1 = __importDefault(require("./routes/leadRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const templateRoutes_1 = __importDefault(require("./routes/templateRoutes"));
const errorMiddleware_1 = require("./middleware/errorMiddleware");
dotenv_1.default.config();
exports.app = (0, express_1.default)();
exports.app.set("trust proxy", 1);
exports.app.use((0, cors_1.default)({
    origin: ["http://localhost:3000", "*.trycloudflare.com"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    // ✅ Added 'x-bot-id' to allowed headers for multi-tenancy support
    allowedHeaders: ["Content-Type", "Authorization", "x-bot-id"]
}));
exports.app.use(express_1.default.json());
exports.app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
// ✅ Routes are mounted at /api
exports.app.use("/api/templates", templateRoutes_1.default);
exports.app.use("/api/bots", botRoutes_1.default);
exports.app.use("/api/flows", flowRoutes_1.default);
exports.app.use("/api/webhook", webhookRoutes_1.default);
exports.app.use("/api/leads", leadRoutes_1.default);
exports.app.use("/api/upload", uploadRoutes_1.default);
exports.app.use("/api", routes_1.default); // Logic for /auth/login resides here
exports.app.use(errorMiddleware_1.errorMiddleware);
//# sourceMappingURL=app.js.map