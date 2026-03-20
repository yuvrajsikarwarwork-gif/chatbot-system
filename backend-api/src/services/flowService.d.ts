export declare const clearUserTimers: (botId: string, from: string) => void;
export declare const executeFlowFromNode: (startNode: any, leadId: number, botId: string, from: string, nodes: any[], edges: any[], phoneId: string, token: string, botName: string, io: any) => Promise<void>;
export declare const processIncomingMessage: (botId: string, from: string, waName: string, incomingText: string, buttonId: string, io: any) => Promise<void>;
//# sourceMappingURL=flowService.d.ts.map