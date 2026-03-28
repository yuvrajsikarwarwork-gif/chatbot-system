require("dotenv").config();
const { Pool } = require("pg");

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.DB_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL or DB_URL must be set");
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await client.query(`
      ALTER TABLE plans
      ADD COLUMN IF NOT EXISTS workspace_limit integer,
      ADD COLUMN IF NOT EXISTS project_limit integer,
      ADD COLUMN IF NOT EXISTS agent_seat_limit integer,
      ADD COLUMN IF NOT EXISTS active_bot_limit integer,
      ADD COLUMN IF NOT EXISTS monthly_campaign_limit integer,
      ADD COLUMN IF NOT EXISTS ai_reply_limit integer,
      ADD COLUMN IF NOT EXISTS extra_agent_seat_price_inr numeric(12,2),
      ADD COLUMN IF NOT EXISTS support_tier text,
      ADD COLUMN IF NOT EXISTS wallet_pricing jsonb DEFAULT '{}'::jsonb
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone_number text
    `);

    await client.query(`
      ALTER TABLE workspaces
      ADD COLUMN IF NOT EXISTS company_website text,
      ADD COLUMN IF NOT EXISTS industry text,
      ADD COLUMN IF NOT EXISTS tax_id text
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS billing_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        plan_id text NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
        status text NOT NULL DEFAULT 'active',
        billing_cycle text NOT NULL DEFAULT 'monthly',
        currency text NOT NULL DEFAULT 'INR',
        base_price_amount numeric(12,2) NOT NULL DEFAULT 0,
        seat_quantity integer NOT NULL DEFAULT 0,
        included_seat_limit integer,
        extra_seat_quantity integer NOT NULL DEFAULT 0,
        extra_seat_unit_price numeric(12,2) NOT NULL DEFAULT 0,
        ai_reply_limit integer,
        ai_overage_unit_price numeric(12,2) NOT NULL DEFAULT 0,
        wallet_auto_topup_enabled boolean NOT NULL DEFAULT false,
        wallet_auto_topup_amount numeric(12,2),
        wallet_low_balance_threshold numeric(12,2),
        external_customer_ref text,
        external_subscription_ref text,
        current_period_start timestamptz,
        current_period_end timestamptz,
        trial_ends_at timestamptz,
        canceled_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_workspace
      ON billing_subscriptions(workspace_id, created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_status
      ON billing_subscriptions(status)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        project_id uuid,
        billing_subscription_id uuid REFERENCES billing_subscriptions(id) ON DELETE SET NULL,
        conversation_id uuid,
        bot_id uuid,
        platform text NOT NULL DEFAULT 'wallet',
        transaction_type text NOT NULL,
        entry_kind text NOT NULL DEFAULT 'wallet',
        pricing_category text,
        unit_type text,
        unit_count numeric(12,3) NOT NULL DEFAULT 1,
        unit_price numeric(12,4),
        amount numeric(12,2) NOT NULL,
        currency text NOT NULL DEFAULT 'INR',
        balance_after numeric(12,2),
        external_ref text,
        reference_type text,
        reference_id text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT wallet_transactions_amount_positive CHECK (amount >= 0),
        CONSTRAINT wallet_transactions_type_allowed CHECK (
          transaction_type IN ('credit', 'debit', 'adjustment', 'hold', 'release', 'refund')
        )
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_workspace
      ON wallet_transactions(workspace_id, created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference
      ON wallet_transactions(reference_type, reference_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_pricing_category
      ON wallet_transactions(pricing_category, created_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_usage_counters (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        project_id uuid,
        metric_key text NOT NULL,
        period_key text NOT NULL,
        quantity numeric(14,3) NOT NULL DEFAULT 0,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT workspace_usage_counters_unique UNIQUE (workspace_id, project_id, metric_key, period_key)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workspace_usage_counters_workspace_period
      ON workspace_usage_counters(workspace_id, period_key)
    `);

    await client.query(`
      INSERT INTO billing_subscriptions (
        workspace_id,
        plan_id,
        status,
        billing_cycle,
        currency,
        base_price_amount,
        current_period_start,
        current_period_end,
        metadata
      )
      SELECT
        s.workspace_id,
        s.plan_id,
        COALESCE(s.status, 'active'),
        COALESCE(s.billing_cycle, 'monthly'),
        COALESCE(s.currency, 'INR'),
        COALESCE(s.price_amount, 0),
        COALESCE(s.start_date::timestamptz, now()),
        s.expiry_date,
        jsonb_build_object(
          'migrated_from', 'subscriptions',
          'legacy_subscription_id', s.id
        )
      FROM subscriptions s
      WHERE NOT EXISTS (
        SELECT 1
        FROM billing_subscriptions bs
        WHERE bs.workspace_id = s.workspace_id
      )
    `);

    await client.query("COMMIT");

    const verification = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('billing_subscriptions', 'wallet_transactions', 'workspace_usage_counters')
      ORDER BY table_name
    `);

    console.log("Billing foundation migration complete.");
    console.log("Tables:", verification.rows.map((row) => row.table_name).join(", "));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
