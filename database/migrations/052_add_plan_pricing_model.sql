ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS pricing_model TEXT NOT NULL DEFAULT 'standard';

UPDATE plans
SET pricing_model = COALESCE(NULLIF(pricing_model, ''), 'standard');
