import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || "5002",
  BACKEND_API_URL: process.env.BACKEND_API_URL || process.env.API_URL || "http://localhost:4000",
  INTERNAL_ENGINE_SECRET: process.env.INTERNAL_ENGINE_SECRET || ""
};
