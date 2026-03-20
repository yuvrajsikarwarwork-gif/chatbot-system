"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWebAdapter = exports.initializeWebConnector = void 0;
const FlowEngine = __importStar(require("../../services/flowEngine"));
const messageRouter_1 = require("../../services/messageRouter");
/**
 * INBOUND: Listens for incoming socket events from the frontend widget.
 */
const initializeWebConnector = (io) => {
    io.on("connection", (socket) => {
        console.log(`🌐 Web Socket Connected | ID: ${socket.id}`);
        // Register User to a specific room
        socket.on("register_web_user", (data) => {
            if (data.botId && data.platformUserId) {
                const room = `${data.botId}_${data.platformUserId}`;
                socket.join(room);
                console.log(`✅ Web User Registered in Room: ${room}`);
            }
        });
        // Handle incoming text OR button clicks
        socket.on("send_web_message", async (data) => {
            try {
                console.log(`[Web Inbound] MSG/Button from ${data.platformUserId}: ${data.text || data.buttonId}`);
                // Pipe into the Flow Engine
                const result = await FlowEngine.processIncomingMessage(data.botId, data.platformUserId, data.userName || "Web User", data.text || "", // User might send text
                data.buttonId || "", // OR they clicked a button
                io, "web");
                if (result?.conversationId && result.actions?.length) {
                    for (const action of result.actions) {
                        await (0, messageRouter_1.routeMessage)(result.conversationId, action, io);
                    }
                }
            }
            catch (err) {
                console.error("[Web Inbound Error]:", err.message);
            }
        });
        socket.on("disconnect", () => {
            console.log(`🔌 Web Socket Disconnected | ID: ${socket.id}`);
        });
    });
};
exports.initializeWebConnector = initializeWebConnector;
/**
 * OUTBOUND: Emits formatted messages back to the specific user's widget.
 */
const sendWebAdapter = async (botId, platformUserId, msg, io) => {
    if (!io)
        return;
    const room = `${botId}_${platformUserId}`;
    // Patch: Standardize payload for the widget
    // We ensure 'templateContent' is included so the widget can render UI components
    const outboundPayload = {
        botId,
        from: platformUserId,
        message: {
            ...msg,
            // Fallback: If it's a template but 'text' is empty, provide a snippet for the notification
            text: msg.text || msg.templateContent?.body || (msg.type === 'template' ? `[Template: ${msg.templateName}]` : "")
        },
        timestamp: new Date().toISOString()
    };
    io.to(room).emit("receive_web_message", outboundPayload);
    if (msg.type === 'template') {
        console.log(`[Web Outbound] Delivered Template: ${msg.templateName} to ${room}`);
    }
};
exports.sendWebAdapter = sendWebAdapter;
//# sourceMappingURL=websiteAdapter.js.map