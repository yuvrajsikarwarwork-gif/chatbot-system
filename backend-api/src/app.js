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
const webhookRoutes_1 = __importDefault(require("./routes/webhookRoutes")); // ✅ IMPORT ADDED
const errorMiddleware_1 = require("./middleware/errorMiddleware");
dotenv_1.default.config();
exports.app = (0, express_1.default)();
// ================= CORS =================
exports.app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-bot-id",
        "Bypass-Tunnel-Reminder",
        "x-localtunnel-skip-warning",
        "ngrok-skip-browser-warning",
    ],
}));
// Preflight fix
exports.app.options("*", (0, cors_1.default)());
// ================= MIDDLEWARE =================
exports.app.use(express_1.default.json());
exports.app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
// ================= ROUTES =================
// 1. 🔴 CRITICAL: Mount Webhook Explicitly First to bypass global auth/index issues
exports.app.use("/api/webhook", webhookRoutes_1.default);
// 2. Then mount all other general routes
exports.app.use("/api", routes_1.default);
// ================= ERROR =================
exports.app.use(errorMiddleware_1.errorMiddleware);
//# sourceMappingURL=app.js.map