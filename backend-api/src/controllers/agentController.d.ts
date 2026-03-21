import { Request, Response } from "express";
export declare const getTickets: (_req: Request, res: Response) => Promise<void>;
export declare const createTicket: (_req: Request, res: Response) => Promise<void>;
export declare const closeTicket: (_req: Request, res: Response) => Promise<void>;
export declare const replyToTicket: (_req: Request, res: Response) => Promise<void>;
export declare const getInboxConversations: (req: Request, res: Response) => Promise<void>;
export declare const getInboxLeads: (req: Request, res: Response) => Promise<void>;
export declare const getConversationDetail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const resumeConversation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const sendAgentReply: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=agentController.d.ts.map