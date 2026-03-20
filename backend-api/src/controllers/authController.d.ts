import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
export declare function register(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function login(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function me(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=authController.d.ts.map