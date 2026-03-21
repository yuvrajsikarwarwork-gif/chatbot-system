"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.botAccessGuard = exports.authorizeRoles = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const db_1 = require("../config/db");
const authMiddleware = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        res.status(401).json({ error: "No token provided" });
        return;
    }
    const token = header.split(" ")[1];
    if (!token) {
        res.status(401).json({ error: "No token provided" });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        console.error("JWT Verification Error:", err);
        res.status(401).json({ error: "Invalid or expired token" });
    }
};
exports.authMiddleware = authMiddleware;
const authorizeRoles = (...allowedRoles) => (req, res, next) => {
    const authReq = req;
    if (!authReq.user?.role) {
        res.status(403).json({ error: "Forbidden: No role assigned" });
        return;
    }
    if (!allowedRoles.includes(authReq.user.role)) {
        res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        return;
    }
    next();
};
exports.authorizeRoles = authorizeRoles;
const botAccessGuard = async (req, res, next) => {
    const authReq = req;
    const userId = authReq.user?.id;
    const botId = req.params.botId || req.body.botId || req.body.bot_id;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    if (!botId) {
        res.status(400).json({ error: "botId is required" });
        return;
    }
    try {
        const ownerRes = await (0, db_1.query)("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [botId, userId]);
        if (ownerRes.rows.length > 0) {
            next();
            return;
        }
        const assignmentRes = await (0, db_1.query)("SELECT role FROM bot_assignments WHERE bot_id = $1 AND user_id = $2", [botId, userId]);
        if (assignmentRes.rows[0]?.role === "admin") {
            next();
            return;
        }
        res.status(403).json({ error: "Forbidden" });
    }
    catch (err) {
        console.error("botAccessGuard Error:", err);
        res.status(500).json({ error: "Authorization check failed" });
    }
};
exports.botAccessGuard = botAccessGuard;
//# sourceMappingURL=authMiddleware.js.map