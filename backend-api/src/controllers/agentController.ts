import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  getTicketsService,
  createTicketService,
  closeTicketService,
  replyTicketService,
} from "../services/agentService";

/**
 * 1. Fetch Inbox Tickets
 * Retrieves all agent tickets for a specific bot owned by the user.
 */
export async function getTickets(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { botId } = req.params;
    
    // Validated by agentService (Bot ownership check)
    const data = await getTicketsService(botId, req.user!.id);
    
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * 2. Create Agent Ticket
 * Manually escalates a conversation to a human agent.
 */
export async function createTicket(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { conversationId } = req.body;

    // Validated by agentService (Conversation -> Bot -> User ownership check)
    const data = await createTicketService(conversationId, req.user!.id);

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * 3. Close Agent Ticket
 * Resolves the human session and returns control to the bot.
 */
export async function closeTicket(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { ticketId } = req.params;

    // Validated by agentService (Ticket -> Conversation -> Bot -> User ownership check)
    const data = await closeTicketService(ticketId, req.user!.id);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * 4. Send Agent Reply
 * Logs the agent's message into the conversation thread. 
 * (Actual transmission to Meta/Web occurs via Connectors monitoring the messages table).
 */
export async function replyToTicket(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { ticketId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Message text is required" });
    }

    // Validated by agentService (Ticket -> Conversation -> Bot -> User ownership check)
    const data = await replyTicketService(ticketId, req.user!.id, text);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}