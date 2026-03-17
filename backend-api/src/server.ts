import { app } from "./app";
import { env } from "./config/env";
import { db } from "./config/db";
import { redis } from "./config/redis";
import http from "http";
import { Server } from "socket.io";
import 'dotenv/config'; // Ensures environment variables are loaded immediately

async function start() {
  try {
    // 1. Core Infrastructure Connections
    await db.connect();
    console.log("✅ DB connected");

    // Optional: Redis check (wrapped in try/catch to prevent boot failure if redis is down)
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
        origin: ["http://localhost:3000", "http://localhost:3001"], // Added 3001 just in case
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    /**
     * GLOBAL ACCESS:
     * This makes 'io' available inside app.ts via req.app.get("io").
     * Crucial for the /webhook route to emit messages.
     */
    app.set("io", io);

    // 4. Socket Connection Logic
    io.on("connection", (socket) => {
      console.log(`🖥️  Frontend connected | ID: ${socket.id}`);

      socket.on("disconnect", () => {
        console.log(`🔌 Frontend disconnected | ID: ${socket.id}`);
      });
    });

    // 5. Start Listening
    const PORT = env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`-----------------------------------------------`);
      console.log(`🚀 ENGINE LIVE | http://localhost:${PORT}`);
      console.log(`📡 SOCKETS ACTIVE | Waiting for debugger...`);
      console.log(`-----------------------------------------------`);
    });

  } catch (err) {
    console.error("❌ CRITICAL BOOT ERROR:", err);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

start();