// backend-api/src/connectors/website/websiteAdapter.ts

import { Server, Socket } from "socket.io";
import { processIncomingMessage } from "../../services/flowEngine";
import { GenericMessage } from "../../services/messageRouter";

/**
 * INBOUND: Listens for incoming socket events from the frontend widget.
 */
export const initializeWebConnector = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`🌐 Web Socket Connected | ID: ${socket.id}`);

    // 1. Register User to an isolated room based on their session/platform ID
    socket.on("register_web_user", (data: { botId: string; platformUserId: string }) => {
      if (data.botId && data.platformUserId) {
        const room = `${data.botId}_${data.platformUserId}`;
        socket.join(room);
        console.log(`✅ Web User Registered in Room: ${room}`);
      }
    });

    // 2. Handle incoming text or button clicks from the widget
    socket.on("send_web_message", async (data: { 
      botId: string; 
      platformUserId: string; 
      userName: string; 
      text: string; 
      buttonId?: string 
    }) => {
      try {
        console.log(`[Web Inbound] MSG from ${data.platformUserId}: ${data.text}`);
        
        // Pipe the standard data into the channel-agnostic Flow Engine
        await processIncomingMessage(
          data.botId,
          data.platformUserId,
          data.userName || "Web User",
          data.text,
          data.buttonId || "",
          io,
          "web" // <--- The critical channel declaration
        );
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
  if (!io) {
      console.error("[Web Outbound Error]: Socket.io instance not provided to Router.");
      return;
  }

  // Target the specific user's room
  const room = `${botId}_${platformUserId}`;
  
  io.to(room).emit("receive_web_message", {
    botId,
    from: platformUserId,
    message: msg, // Sending the full GenericMessage object (text, buttons, type)
    timestamp: new Date().toISOString()
  });
  
  console.log(`[Web Outbound] Sent payload to ${room}`);
};