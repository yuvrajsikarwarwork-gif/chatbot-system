"use strict";
// src/config/env.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    PORT: process.env.PORT || 4000,
    DB_URL: process.env.DB_URL || "",
    REDIS_URL: process.env.REDIS_URL || "",
    JWT_SECRET: process.env.JWT_SECRET || "secret",
    NODE_ENV: process.env.NODE_ENV || "development",
};
console.log("👉 MY DATABASE URL IS:", exports.env.DB_URL);
//# sourceMappingURL=env.js.map