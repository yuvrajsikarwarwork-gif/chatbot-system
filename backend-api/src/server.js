"use strict";
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
const websiteAdapter_1 = require("./connectors/website/websiteAdapter");
async function start() {
    try {
        await db_1.db.connect();
        console.log("✅ DB connected");
        try {
            await redis_1.redis.ping();
            console.log("✅ Redis connected");
        }
        catch {
            console.warn("⚠️ Redis not reachable");
        }
        const server = http_1.default.createServer(app_1.app);
        const io = new socket_io_1.Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                credentials: true,
            },
        });
        app_1.app.set("io", io);
        (0, websiteAdapter_1.initializeWebConnector)(io);
        // CRON
        node_cron_1.default.schedule("* * * * *", async () => {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            try {
                const result = await (0, db_1.query)(`UPDATE conversations
           SET status='active', current_node=NULL
           WHERE status='agent_pending'
           AND updated_at < $1
           RETURNING id`, [tenMinutesAgo]);
                if (result.rowCount) {
                    console.log("Auto resumed", result.rowCount);
                }
            }
            catch (err) {
                console.error(err);
            }
        });
        io.on("connection", (socket) => {
            console.log("Socket connected", socket.id);
        });
        // 🔴 CRITICAL FIX: Lock to 4000 to match the tunnel and frontend expectations
        const PORT = Number(env_1.env.PORT) || 4000;
        server.listen(PORT, "0.0.0.0", () => {
            console.log(`✅ BACKEND API LIVE | http://localhost:${PORT}`);
        });
    }
    catch (err) {
        console.error(err);
    }
}
start();
//# sourceMappingURL=server.js.map