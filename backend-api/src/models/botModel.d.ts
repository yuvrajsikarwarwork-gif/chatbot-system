export declare function findBotsByUser(userId: string): Promise<any[]>;
export declare function findBotById(id: string): Promise<any>;
export declare function createBot(userId: string, name: string): Promise<any>;
export declare function updateBot(id: string, userId: string, data: {
    name?: string;
    wa_phone_number_id?: string;
    wa_access_token?: string;
    trigger_keywords?: string;
    status?: string;
}): Promise<any>;
export declare function deleteBot(id: string, userId: string): Promise<void>;
//# sourceMappingURL=botModel.d.ts.map