/**
 * Handles incoming messages from external channel webhooks (WhatsApp, FB, etc.)
 * Resolves the user to a conversation and saves the message.
 */
export declare function incomingMessageService(botId: string, channel: string, externalUserId: string, messageText: string, contactName?: string): Promise<any>;
//# sourceMappingURL=messageService.d.ts.map