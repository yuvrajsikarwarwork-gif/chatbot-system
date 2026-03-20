import { Request, Response } from "express";
export declare const verifyWebhook: (req: Request, res: Response) => Response<any, Record<string, any>>;
export declare const receiveMessage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=webhookController.d.ts.map