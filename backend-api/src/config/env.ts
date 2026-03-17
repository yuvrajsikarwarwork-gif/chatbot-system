// src/config/env.ts

import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || 4000,

  DB_URL: process.env.DB_URL || "",

  REDIS_URL: process.env.REDIS_URL || "",

  JWT_SECRET: process.env.JWT_SECRET || "secret",

  NODE_ENV: process.env.NODE_ENV || "development",

};
console.log("👉 MY DATABASE URL IS:", env.DB_URL);