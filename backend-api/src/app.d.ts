import { JwtPayload } from "jsonwebtoken";
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload & {
                user_id?: string;
                role?: string;
            };
        }
    }
}
export declare const app: import("express-serve-static-core").Express;
//# sourceMappingURL=app.d.ts.map