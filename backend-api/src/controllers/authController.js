"use strict";
// src/controllers/authController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.me = me;
const authService_1 = require("../services/authService");
async function register(req, res, next) {
    try {
        const { email, password, name } = req.body;
        const data = await (0, authService_1.registerService)(email, password, name);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        const data = await (0, authService_1.loginService)(email, password);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
async function me(req, res, next) {
    try {
        const user = await (0, authService_1.getUserService)(req.user.user_id);
        res.json(user);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=authController.js.map