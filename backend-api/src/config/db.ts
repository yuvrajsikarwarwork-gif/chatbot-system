import { Pool } from "pg";
import { env } from "./env";

export const db = new Pool({
  connectionString: env.DB_URL,
});

// Added: Connection validation logic
export const connectDB = async () => {
  try {
    const client = await db.connect();
    console.log("PostgreSQL Connected successfully");
    client.release();
  } catch (err) {
    console.error("PostgreSQL Connection Error:", err);
    throw err; // Force server.ts to handle the failure
  }
};

export const query = (text: string, params?: any[]) => {
  return db.query(text, params);
};