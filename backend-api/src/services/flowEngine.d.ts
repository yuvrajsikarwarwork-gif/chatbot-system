import { GenericMessage } from "./messageRouter";
export declare const clearUserTimers: (botId: string, from: string) => void;
export declare const executeFlowFromNode: (startNode: any, convId: string, botId: string, platformUserId: string, nodes: any[], edges: any[], channel: string, io: any) => Promise<GenericMessage[]>;
export declare const processIncomingMessage: (botId: string, platformUserId: string, userName: string, incomingText: string, buttonId: string, io: any, channel: string) => Promise<{
    conversationId: any;
    actions: GenericMessage[];
} | undefined>;
//# sourceMappingURL=flowEngine.d.ts.map