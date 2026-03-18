// src/services/messageService.ts

import { 
  findConversation, 
  createConversation 
} from "../models/conversationModel";
import { 
  createMessage 
} from "../models/messageModel";

/**
 * Handles incoming messages from external channel webhooks (WhatsApp, FB, etc.)
 * Resolves the user to a conversation and saves the message.
 */
export async function incomingMessageService(
  botId: string,
  channel: string,
  externalUserId: string,
  messageText: string
) {
  // 1. Attempt to find an active conversation for this user on this channel
  let conversation = await findConversation(botId, channel, externalUserId);

  // 2. If no conversation exists, initialize a new one
  if (!conversation) {
    conversation = await createConversation(botId, channel, externalUserId);
  }

  // 3. Save the message tied strictly to the conversation ID
  // Sender is hardcoded to 'user' for inbound external messages
  const savedMessage = await createMessage(
    conversation.id, 
    "user", 
    messageText
  );

  return savedMessage;
}