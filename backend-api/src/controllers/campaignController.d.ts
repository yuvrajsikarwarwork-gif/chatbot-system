import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
/**
 * Fetch all available templates from your database (Synced from Meta)
 */
export declare const getTemplates: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Backward-compatible bridge to the conversation-first template launch path
 */
export declare const launchCampaign: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=campaignController.d.ts.map