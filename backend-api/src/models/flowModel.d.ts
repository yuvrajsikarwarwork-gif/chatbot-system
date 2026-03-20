export declare function findFlowsByBot(botId: string): Promise<any[]>;
export declare function findFlowById(id: string): Promise<any>;
/**
 * UPSERT LOGIC: Handles both creation and updates.
 * Safely stringifies the entire flow object into the single flow_json column.
 */
export declare function createFlow(botId: string, flowJson: any): Promise<any>;
export declare function updateFlow(id: string, botId: string, // ✅ Added tenant scope
flowJson: any): Promise<any>;
export declare function deleteFlow(id: string, botId: string): Promise<void>;
//# sourceMappingURL=flowModel.d.ts.map