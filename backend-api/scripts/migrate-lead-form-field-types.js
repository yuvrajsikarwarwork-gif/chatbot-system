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
    const migrationPath = path.resolve(
      __dirname,
      "../../database/migrations/057_extend_lead_forms_with_typed_fields.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");
    await pool.query(sql);
    console.log("Lead form typed-field migration applied successfully.");
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Failed to apply lead form typed-field migration", err);
  process.exit(1);
});
