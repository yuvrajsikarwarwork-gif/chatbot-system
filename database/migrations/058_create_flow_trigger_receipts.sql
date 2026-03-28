CREATE TABLE IF NOT EXISTS flow_trigger_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  request_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  bot_id UUID NULL REFERENCES bots(id) ON DELETE SET NULL,
  flow_id UUID NULL REFERENCES flows(id) ON DELETE SET NULL,
  conversation_id UUID NULL REFERENCES conversations(id) ON DELETE SET NULL,
  contact_id UUID NULL REFERENCES contacts(id) ON DELETE SET NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NULL,
  error_message TEXT NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flow_trigger_receipts_fingerprint_created
  ON flow_trigger_receipts (request_fingerprint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_flow_trigger_receipts_status_created
  ON flow_trigger_receipts (status, created_at DESC);
