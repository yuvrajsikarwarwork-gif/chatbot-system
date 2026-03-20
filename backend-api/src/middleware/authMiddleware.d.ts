import { Request, Response, NextFunction } from "express";
export interface JwtPayload {
    id: string;
    role: string;
}
export interface AuthRequest extends Request {
    user?: JwtPayload;
}
export declare const authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const authorizeRoles: (...allowedRoles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=authMiddleware.d.ts.map