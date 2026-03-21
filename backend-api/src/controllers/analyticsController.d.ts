import { NextFunction, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
export declare function getBotStats(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=analyticsController.d.ts.map