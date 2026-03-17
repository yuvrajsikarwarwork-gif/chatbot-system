CREATE TABLE integrations (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    bot_id UUID NOT NULL,

    channel TEXT NOT NULL,

    credentials JSONB,

    config JSONB,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_integrations_bot
        FOREIGN KEY (bot_id)
        REFERENCES bots(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_integrations_bot_id
ON integrations(bot_id);

CREATE INDEX idx_integrations_channel
ON integrations(channel);