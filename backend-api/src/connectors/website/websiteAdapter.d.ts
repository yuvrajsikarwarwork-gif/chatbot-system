import { Server } from "socket.io";
import { GenericMessage } from "../../services/messageRouter";
/**
 * INBOUND: Listens for incoming socket events from the frontend widget.
 */
export declare const initializeWebConnector: (io: Server) => void;
/**
 * OUTBOUND: Emits formatted messages back to the specific user's widget.
 */
export declare const sendWebAdapter: (botId: string, platformUserId: string, msg: GenericMessage, io: Server) => Promise<void>;
//# sourceMappingURL=websiteAdapter.d.ts.map