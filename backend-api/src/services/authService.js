"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginService = loginService;
exports.registerService = registerService;
exports.getUserService = getUserService;
// src/services/authService.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = require("../models/userModel");
const env_1 = require("../config/env");
async function loginService(email, password) {
    const user = await (0, userModel_1.findUserByEmail)(email);
    // We know this is returning { id, email, password, role } from your logs
    console.log("DATABASE_RESULT:", user);
    if (!user) {
        throw { status: 400, message: "Invalid login" };
    }
    // Use 'user.password' to match the terminal log result exactly
    const ok = await bcryptjs_1.default.compare(password, user.password);
    console.log("Password Match Status:", ok);
    if (!ok) {
        throw { status: 400, message: "Invalid login" };
    }
    // Inject role into JWT payload
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, env_1.env.JWT_SECRET, { expiresIn: '24h' });
    // Remove password before returning
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
}
// Ensure your registerService also uses the correct column for consistency
async function registerService(email, password, name, role) {
    const existing = await (0, userModel_1.findUserByEmail)(email);
    if (existing) {
        throw { status: 400, message: "User exists" };
    }
    const hash = await bcryptjs_1.default.hash(password, 10);
    // Create user, allowing role override if provided (useful for seed scripts, but validate in controllers if exposed)
    const user = await (0, userModel_1.createUser)(email, hash, name, role || 'user');
    // Inject role into JWT payload
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, env_1.env.JWT_SECRET, { expiresIn: '24h' });
    return { user, token };
}
async function getUserService(id) {
    const user = await (0, userModel_1.findUserById)(id);
    if (user) {
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    return null;
}
//# sourceMappingURL=authService.js.map