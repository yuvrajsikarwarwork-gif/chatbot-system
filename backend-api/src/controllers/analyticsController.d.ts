import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
export declare function getBotStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function getEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=analyticsController.d.ts.map