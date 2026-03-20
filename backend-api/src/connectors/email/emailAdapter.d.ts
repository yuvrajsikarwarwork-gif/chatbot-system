import { GenericMessage } from "../../services/messageRouter";
/**
 * OUTBOUND: Converts a generic message or generic template into an HTML email.
 */
export declare const sendEmailAdapter: (botId: string, toEmail: string, msg: GenericMessage) => Promise<void>;
//# sourceMappingURL=emailAdapter.d.ts.map