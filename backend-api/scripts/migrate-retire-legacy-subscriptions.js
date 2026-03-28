require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.DB_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL or DB_URL is required");
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    const migrationPath = path.resolve(__dirname, "../../database/migrations/050_retire_legacy_subscriptions.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("Legacy subscriptions retirement migration complete.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Legacy subscriptions retirement migration failed:", error);
  process.exit(1);
});
