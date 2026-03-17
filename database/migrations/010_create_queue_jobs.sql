CREATE TABLE queue_jobs (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    job_type TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'pending',

    payload JSONB,

    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_queue_status
ON queue_jobs(status);

CREATE INDEX idx_queue_type
ON queue_jobs(job_type);

CREATE INDEX idx_queue_created
ON queue_jobs(created_at);