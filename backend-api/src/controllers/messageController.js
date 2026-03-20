"use strict";
// src/controllers/messageController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.incomingMessage = incomingMessage;
const messageService_1 = require("../services/messageService");
async function incomingMessage(req, res, next) {
    try {
        const { bot_id, channel, external_user_id, message, } = req.body;
        const data = await (0, messageService_1.incomingMessageService)(bot_id, channel, external_user_id, message);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=messageController.js.map