"use strict";
// backend-api/src/server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const db_1 = require("./config/db");
const redis_1 = require("./config/redis");
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const node_cron_1 = __importDefault(require("node-cron"));
require("dotenv/config");
const messageRouter_1 = require("./services/messageRouter"); // <-- Added Router Import
async function start() {
    try {
        // 1. Core Infrastructure Connections
        await db_1.db.connect();
        console.log("✅ DB connected");
        try {
            await redis_1.redis.ping();
            console.log("✅ Redis connected");
        }
        catch (e) {
            console.warn("⚠️ Redis not reachable, skipping cache features.");
        }
        // 2. Create HTTP Server from Express App
        const server = http_1.default.createServer(app_1.app);
        // 3. Initialize Socket.io
        const io = new socket_io_1.Server(server, {
            cors: {
                origin: ["http://localhost:3000", "http://localhost:3001"],
                methods: ["GET", "POST"],
                credentials: true
            }
        });
        app_1.app.set("io", io);
        // --- PHASE 3: MULTI-CHANNEL UPGRADED 10-MINUTE AUTO-TIMEOUT ---
        node_cron_1.default.schedule("* * * * *", async () => {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            try {
                // Find timed-out chats across ALL channels
                const result = await (0, db_1.query)(`UPDATE conversations 
           SET status = 'active', current_node = NULL 
           WHERE status = 'agent_pending' AND updated_at < $1
           RETURNING id, bot_id, contact_id, channel`, [tenMinutesAgo]);
                if (result.rowCount && result.rowCount > 0) {
                    console.log(`🤖 Auto-resumed bot for ${result.rowCount} inactive sessions.`);
                    for (const conv of result.rows) {
                        // Fetch the contact to get the platform_user_id
                        const contactRes = await (0, db_1.query)(`SELECT platform_user_id FROM contacts WHERE id = $1`, [conv.contact_id]);
                        const platformUserId = contactRes.rows[0]?.platform_user_id;
                        if (platformUserId) {
                            const systemMsg = {
                                type: "system",
                                text: "Agent session ended due to inactivity. The bot has resumed."
                            };
                            // Dispatch via the central router (handles logging, websocket emit, and channel delivery)
                            await (0, messageRouter_1.routeMessage)(conv.id, systemMsg, io);
                        }
                    }
                }
            }
            catch (err) {
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
        const PORT = env_1.env.PORT || 4000;
        server.listen(PORT, () => {
            console.log(`🚀 ENGINE LIVE | http://localhost:${PORT}`);
        });
    }
    catch (err) {
        console.error("❌ CRITICAL BOOT ERROR:", err);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=server.js.map