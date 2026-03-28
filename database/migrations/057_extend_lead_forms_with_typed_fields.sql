ALTER TABLE lead_form_fields
    ADD COLUMN IF NOT EXISTS field_type TEXT NOT NULL DEFAULT 'short_text',
    ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS custom_variables JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_leads_custom_variables_gin
ON leads
USING GIN (custom_variables);
