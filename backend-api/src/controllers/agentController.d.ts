import { Request, Response } from "express";
export declare const getTickets: (req: Request, res: Response) => Promise<void>;
export declare const createTicket: (req: Request, res: Response) => Promise<void>;
export declare const closeTicket: (req: Request, res: Response) => Promise<void>;
export declare const replyToTicket: (req: Request, res: Response) => Promise<void>;
export declare const getInboxLeads: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/conversations/:conversationId
 * Fetches the full conversation details and message history.
 */
export declare const getConversationDetail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/conversations/:conversationId/reply
 * Sends a manual message from the Admin Dashboard to the user.
 */
export declare const resumeConversation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const sendAgentReply: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=agentController.d.ts.map