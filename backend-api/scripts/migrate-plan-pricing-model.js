const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const connectionString = process.env.DATABASE_URL || process.env.DB_URL;
  if (!connectionString) {
    throw new Error("DB_URL or DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString });
  try {
    const migrationPath = path.resolve(__dirname, "../../database/migrations/052_add_plan_pricing_model.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");
    await pool.query(sql);
    console.log("Plan pricing model migration applied successfully.");
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Failed to apply plan pricing model migration", err);
  process.exit(1);
});
