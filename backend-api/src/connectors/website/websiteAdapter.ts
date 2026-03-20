import { Server, Socket } from "socket.io";
import * as FlowEngine from "../../services/flowEngine";
import { GenericMessage } from "../../services/messageRouter";
import { routeMessage } from "../../services/messageRouter";

/**
 * INBOUND: Listens for incoming socket events from the frontend widget.
 */
export const initializeWebConnector = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`🌐 Web Socket Connected | ID: ${socket.id}`);

    // Register User to a specific room
    socket.on("register_web_user", (data: { botId: string; platformUserId: string }) => {
      if (data.botId && data.platformUserId) {
        const room = `${data.botId}_${data.platformUserId}`;
        socket.join(room);
        console.log(`✅ Web User Registered in Room: ${room}`);
      }
    });

    // Handle incoming text OR button clicks
    socket.on("send_web_message", async (data: { 
      botId: string; 
      platformUserId: string; 
      userName: string; 
      text: string; 
      buttonId?: string 
    }) => {
      try {
        console.log(`[Web Inbound] MSG/Button from ${data.platformUserId}: ${data.text || data.buttonId}`);
        
        // Pipe into the Flow Engine
        const result = await FlowEngine.processIncomingMessage(
          data.botId,
          data.platformUserId,
          data.userName || "Web User",
          data.text || "",     // User might send text
          data.buttonId || "", // OR they clicked a button
          io,
          "web"
        );

        if (result?.conversationId && result.actions?.length) {
          for (const action of result.actions) {
            await routeMessage(result.conversationId, action, io);
          }
        }
      } catch (err: any) {
        console.error("[Web Inbound Error]:", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Web Socket Disconnected | ID: ${socket.id}`);
    });
  });
};

/**
 * OUTBOUND: Emits formatted messages back to the specific user's widget.
 */
export const sendWebAdapter = async (
  botId: string, 
  platformUserId: string, 
  msg: GenericMessage, 
  io: Server
) => {
  if (!io) return;

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
