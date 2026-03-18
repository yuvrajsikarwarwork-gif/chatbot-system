import { app } from "./app";
import { env } from "./config/env";
import { db, query } from "./config/db"; 
import { redis } from "./config/redis";
import http from "http";
import { Server } from "socket.io";
import cron from "node-cron"; 
import axios from "axios";
import 'dotenv/config';

const DEFAULT_PHONE_ID = process.env.PHONE_NUMBER_ID || "1030050193525162";
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";

async function start() {
  try {
    // 1. Core Infrastructure Connections
    await db.connect();
    console.log("✅ DB connected");

    try {
      await redis.ping();
      console.log("✅ Redis connected");
    } catch (e) {
      console.warn("⚠️ Redis not reachable, skipping cache features.");
    }

    // 2. Create HTTP Server from Express App
    const server = http.createServer(app);

    // 3. Initialize Socket.io
    const io = new Server(server, {
      cors: {
        origin: ["http://localhost:3000", "http://localhost:3001"],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    app.set("io", io);

    // --- PHASE 3: UPGRADED 10-MINUTE AUTO-TIMEOUT ---
    cron.schedule("* * * * *", async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      try {
        // Find timed-out chats and RETURNING wa_number so we know WHO timed out
        const result = await query(
          `UPDATE leads 
           SET human_active = false, bot_active = true, last_node_id = NULL 
           WHERE human_active = true AND updated_at < $1
           RETURNING wa_number`,
          [tenMinutesAgo]
        );

        if (result.rowCount > 0) {
          console.log(`🤖 Auto-resumed bot for ${result.rowCount} inactive sessions.`);

          // Process the cleanup for each timed-out lead
          for (const row of result.rows) {
            const waNumber = row.wa_number;
            const systemMsg = "Agent session ended due to inactivity. The bot has resumed.";

            // 1. Send the notification to the user via WhatsApp API
            await axios({
              method: "POST",
              url: `https://graph.facebook.com/v18.0/${DEFAULT_PHONE_ID}/messages`,
              data: { messaging_product: "whatsapp", to: waNumber, type: "text", text: { body: systemMsg } },
              headers: { Authorization: `Bearer ${TOKEN}` }
            }).catch(e => console.error("Cron WA Send Error:", e.message));

            // 2. Log the System message to the database
            await query(`INSERT INTO messages (wa_number, message, sender) VALUES ($1, $2, 'system')`, [waNumber, systemMsg]);

            // 3. Ping the Frontend Dashboard to instantly update the UI
            io.emit("whatsapp_message", {
              from: waNumber,
              text: systemMsg,
              isBot: true,
              sender: "system"
            });
          }
        }
      } catch (err) {
        console.error("❌ Cron Job Error:", err);
      }
    });

    // 4. Socket Connection Logic
    io.on("connection", (socket) => {
      console.log(`🖥️ Frontend connected | ID: ${socket.id}`);
      socket.on("disconnect", () => {
        console.log(`🔌 Frontend disconnected | ID: ${socket.id}`);
      });
    });

    // 5. Start Listening
    const PORT = env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`🚀 ENGINE LIVE | http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error("❌ CRITICAL BOOT ERROR:", err);
    process.exit(1);
  }
}

start();