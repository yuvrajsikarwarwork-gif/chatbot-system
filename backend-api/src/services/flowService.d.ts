/**
 * Retrieves flow by bot ID.
 */
export declare const getFlowsByBotService: (botId: string, userId?: string) => Promise<any>;
/**
 * Retrieves a single flow, creating a default if none exists.
 */
export declare function getFlowService(botId: string, userId: string): Promise<any>;
/**
 * Handles Saving/Upserting flows.
 */
export declare function saveFlowService(botId: string, userId: string, flowJson: any): Promise<any>;
export declare function updateFlowService(id: string, userId: string, flowJson: any): Promise<any>;
export declare function deleteFlowService(id: string, userId: string): Promise<void>;
//# sourceMappingURL=flowService.d.ts.map