"use strict";
// src/services/messageService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.incomingMessageService = incomingMessageService;
const conversationModel_1 = require("../models/conversationModel");
const messageModel_1 = require("../models/messageModel");
/**
 * Handles incoming messages from external channel webhooks (WhatsApp, FB, etc.)
 * Resolves the user to a conversation and saves the message.
 */
async function incomingMessageService(botId, channel, externalUserId, messageText) {
    // 1. Attempt to find an active conversation for this user on this channel
    let conversation = await (0, conversationModel_1.findConversation)(botId, channel, externalUserId);
    // 2. If no conversation exists, initialize a new one
    if (!conversation) {
        conversation = await (0, conversationModel_1.createConversation)(botId, channel, externalUserId);
    }
    // 3. Save the message tied strictly to the conversation ID
    // Sender is hardcoded to 'user' for inbound external messages
    const savedMessage = await (0, messageModel_1.createMessage)(conversation.id, "user", messageText);
    return savedMessage;
}
//# sourceMappingURL=messageService.js.map