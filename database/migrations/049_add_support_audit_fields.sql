ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS impersonated_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS support_access_id UUID REFERENCES support_access(id) ON DELETE SET NULL;

UPDATE audit_logs
SET actor_user_id = COALESCE(actor_user_id, user_id)
WHERE actor_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_created_at
ON audit_logs(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_impersonated_user_created_at
ON audit_logs(impersonated_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_support_access
ON audit_logs(support_access_id);
