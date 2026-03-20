import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
/**
 * UNIFIED UPDATE CONTROLLER
 * Handles name, keywords, tokens, phone ID, and the Live Status toggle.
 */
export declare function updateBotCtrl(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * UNLOCK LOGIC (SLOT ACTIVATION)
 * This updates the bot's activity timestamp.
 * The 'Max 5' slots limit is enforced on the Frontend.
 */
export declare function activateBotCtrl(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * FETCH ALL BOTS
 */
export declare function getBots(req: AuthRequest, res: Response): Promise<void>;
/**
 * FETCH SINGLE BOT
 */
export declare function getBot(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * PROVISION NEW BOT
 */
export declare function createBotCtrl(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * DELETE BOT
 */
export declare function deleteBotCtrl(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=botController.d.ts.map