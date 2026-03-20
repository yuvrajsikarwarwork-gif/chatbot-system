import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
/**
 * Invite a teammate to a Bot Workspace
 */
export declare const inviteTeammate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Update Personal User Settings
 */
export declare const updateProfile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=userController.d.ts.map