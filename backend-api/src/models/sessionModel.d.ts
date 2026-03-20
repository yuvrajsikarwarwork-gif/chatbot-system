export interface ChatSession {
    id: string;
    bot_id: string;
    user_phone: string;
    current_node_id: string | null;
    session_data: any;
    updated_at: Date;
}
export declare const getOrCreateSession: (botId: string, userPhone: string, defaultNodeId: string) => Promise<ChatSession>;
export declare const updateSessionNode: (sessionId: string, nextNodeId: string, additionalData?: any) => Promise<void>;
export declare const clearSession: (sessionId: string) => Promise<void>;
//# sourceMappingURL=sessionModel.d.ts.map