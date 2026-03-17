// src/services/agentService.ts

import {
  createTicket,
  findTicketById,
  findTicketsByBot,
  updateTicketStatus,
} from "../models/agentTicketModel";

import { findConversationById } from "../models/conversationModel";
import { findBotById } from "../models/botModel";

import { createMessage } from "../models/messageModel";

export async function createTicketService(
  conversationId: string,
  userId: string
) {
  const convo =
    await findConversationById(
      conversationId
    );

  if (!convo) throw { status: 404 };

  const bot = await findBotById(
    convo.bot_id
  );

  if (!bot || bot.user_id !== userId) {
    throw { status: 404 };
  }

  return createTicket(
    conversationId,
    "open"
  );
}

export async function getTicketsService(
  botId: string,
  userId: string
) {
  const bot = await findBotById(botId);

  if (!bot || bot.user_id !== userId) {
    throw { status: 404 };
  }

  return findTicketsByBot(botId);
}

export async function closeTicketService(
  ticketId: string,
  userId: string
) {
  const ticket =
    await findTicketById(ticketId);

  if (!ticket) throw { status: 404 };

  const convo =
    await findConversationById(
      ticket.conversation_id
    );

  const bot = await findBotById(
    convo.bot_id
  );

  if (!bot || bot.user_id !== userId) {
    throw { status: 404 };
  }

  return updateTicketStatus(
    ticketId,
    "closed"
  );
}

export async function replyTicketService(
  ticketId: string,
  userId: string,
  text: string
) {
  const ticket =
    await findTicketById(ticketId);

  if (!ticket) throw { status: 404 };

  const convo =
    await findConversationById(
      ticket.conversation_id
    );

  const bot = await findBotById(
    convo.bot_id
  );

  if (!bot || bot.user_id !== userId) {
    throw { status: 404 };
  }

  return createMessage(
    convo.id,
    "agent",
    text
  );
}