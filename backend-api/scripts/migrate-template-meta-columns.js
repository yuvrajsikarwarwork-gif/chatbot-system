require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { Client } = require("pg");

const MIGRATION_SQL = `
ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS meta_template_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_template_name TEXT,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS meta_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meta_payload JSONB;

CREATE INDEX IF NOT EXISTS idx_templates_meta_template_id
  ON templates (meta_template_id)
  WHERE meta_template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_templates_meta_template_name
  ON templates (meta_template_name)
  WHERE meta_template_name IS NOT NULL;
`;

async function main() {
  if (!process.env.DB_URL) {
    throw new Error("DB_URL is not set.");
  }

  const client = new Client({
    connectionString: process.env.DB_URL,
  });

  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(MIGRATION_SQL);

    const verification = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'templates'
         AND column_name IN (
           'meta_template_id',
           'meta_template_name',
           'rejected_reason',
           'meta_last_synced_at',
           'meta_payload'
         )
       ORDER BY column_name`
    );

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          ok: true,
          table: "templates",
          addedOrVerifiedColumns: verification.rows.map((row) => row.column_name),
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
