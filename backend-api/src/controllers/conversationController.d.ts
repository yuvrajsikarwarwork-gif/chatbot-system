import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
export declare function getConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function getConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function getMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function updateConversationStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=conversationController.d.ts.map