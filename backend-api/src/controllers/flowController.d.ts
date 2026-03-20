import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
export declare function getFlowsByBot(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getFlow(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * BULLETPROOF SAVE LOGIC
 * Extracts parameters and validates them before hitting the database.
 */
export declare function saveFlowCtrl(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function createFlowCtrl(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function updateFlowCtrl(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function deleteFlowCtrl(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=flowController.d.ts.map