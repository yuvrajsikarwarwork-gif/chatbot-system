import { Request, Response } from "express";
/**
 * 1. Create Template (Consolidated JSONB Content)
 */
export declare const createTemplate: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTemplates: (req: Request, res: Response) => Promise<void>;
/**
 * 2. Update Template (Consolidated JSONB Content)
 */
export declare const updateTemplate: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const approveTemplate: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteTemplate: (req: Request, res: Response) => Promise<void>;
/**
 * 3. Launch Campaign (Conversation-First Refactor)
 */
export declare const launchCampaign: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTemplateLogs: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=templateController.d.ts.map