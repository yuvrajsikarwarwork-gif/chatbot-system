import { Request, RequestHandler } from "express";
export interface JwtPayload {
    id?: string;
    user_id?: string;
    role?: string;
}
export interface AuthRequest extends Request {
    user?: JwtPayload;
}
export declare const authMiddleware: RequestHandler;
export declare const authorizeRoles: (...allowedRoles: string[]) => RequestHandler;
export declare const botAccessGuard: RequestHandler;
//# sourceMappingURL=authMiddleware.d.ts.map