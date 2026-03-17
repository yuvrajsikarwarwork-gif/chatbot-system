CREATE TABLE flows (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    bot_id UUID NOT NULL,

    flow_name TEXT NOT NULL,

    flow_json JSONB NOT NULL,

    version INTEGER DEFAULT 1,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_flows_bot
        FOREIGN KEY (bot_id)
        REFERENCES bots(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_flows_bot_id
ON flows(bot_id);