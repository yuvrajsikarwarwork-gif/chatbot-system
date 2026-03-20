export declare const getBotsService: (userId: string) => Promise<any[]>;
export declare const getBotService: (id: string, userId: string) => Promise<any>;
export declare const createBotService: (userId: string, name: string, wa_phone_number_id: string, wa_access_token: string, trigger_keywords: string) => Promise<any>;
/**
 * UPDATED: Optimized to handle dynamic updates (Status, Meta Credentials, and Core Details)
 */
export declare const updateBotService: (id: string, userId: string, updateData: any) => Promise<any>;
export declare const deleteBotService: (id: string, userId: string) => Promise<void>;
//# sourceMappingURL=botService.d.ts.map