export interface GenericMessage {
    type: "text" | "interactive" | "system" | "template" | "media";
    text?: string;
    buttons?: {
        id: string;
        title: string;
    }[];
    templateName?: string;
    languageCode?: string;
    templateContent?: any;
    mediaUrl?: string;
}
export declare const routeMessage: (conversationId: string, message: GenericMessage, io?: any) => Promise<void>;
//# sourceMappingURL=messageRouter.d.ts.map