ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purge_after TIMESTAMPTZ;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE bots
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_at ON workspaces (deleted_at);
CREATE INDEX IF NOT EXISTS idx_workspaces_purge_after ON workspaces (purge_after);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_deleted_at ON projects (workspace_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_deleted_at ON campaigns (workspace_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_bots_workspace_deleted_at ON bots (workspace_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_leads_workspace_deleted_at ON leads (workspace_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_deleted_at ON conversations (workspace_id, deleted_at);

ALTER TABLE queue_jobs
  ADD COLUMN IF NOT EXISTS job_type TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'queue_jobs'
      AND column_name = 'type'
  ) THEN
    UPDATE queue_jobs
    SET job_type = COALESCE(job_type, type)
    WHERE job_type IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'queue_jobs'
      AND column_name = 'run_at'
  ) THEN
    UPDATE queue_jobs
    SET available_at = COALESCE(available_at, run_at, created_at, NOW());
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'queue_jobs'
      AND column_name = 'attempts'
  ) THEN
    UPDATE queue_jobs
    SET retry_count = COALESCE(retry_count, attempts, 0);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'queue_jobs'
      AND column_name = 'max_attempts'
  ) THEN
    UPDATE queue_jobs
    SET max_retries = COALESCE(max_retries, max_attempts);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_queue_jobs_job_type ON queue_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_export_jobs ON queue_jobs(job_type, status, available_at, created_at);
