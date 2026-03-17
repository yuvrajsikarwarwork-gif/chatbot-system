import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  connectTimeout: 5000, // 5 seconds timeout
});

redis.on("error", (err) => {
  console.error("Redis Connection Error:", err);
});