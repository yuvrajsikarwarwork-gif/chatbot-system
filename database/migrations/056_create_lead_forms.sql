CREATE TABLE IF NOT EXISTS lead_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_lead_forms_workspace'
    ) THEN
        ALTER TABLE lead_forms
            ADD CONSTRAINT fk_lead_forms_workspace
            FOREIGN KEY (workspace_id)
            REFERENCES workspaces(id)
            ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_forms_workspace
ON lead_forms(workspace_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_forms_workspace_name
ON lead_forms(workspace_id, lower(name));

CREATE TABLE IF NOT EXISTS lead_form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL,
    field_key TEXT NOT NULL,
    question_label TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_lead_form_fields_form'
    ) THEN
        ALTER TABLE lead_form_fields
            ADD CONSTRAINT fk_lead_form_fields_form
            FOREIGN KEY (form_id)
            REFERENCES lead_forms(id)
            ON DELETE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_form_fields_form_key
ON lead_form_fields(form_id, field_key);

CREATE INDEX IF NOT EXISTS idx_lead_form_fields_form_sort
ON lead_form_fields(form_id, sort_order ASC, created_at ASC);

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS lead_form_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_leads_lead_form'
    ) THEN
        ALTER TABLE leads
            ADD CONSTRAINT fk_leads_lead_form
            FOREIGN KEY (lead_form_id)
            REFERENCES lead_forms(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_lead_form
ON leads(lead_form_id, created_at DESC);
