CREATE TABLE analytics_events (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    bot_id UUID NOT NULL,

    conversation_id UUID,

    event_type TEXT NOT NULL,

    event_payload JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_analytics_bot
        FOREIGN KEY (bot_id)
        REFERENCES bots(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_analytics_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_analytics_bot
ON analytics_events(bot_id, created_at);

CREATE INDEX idx_analytics_event_type
ON analytics_events(event_type);

CREATE INDEX idx_analytics_conversation
ON analytics_events(conversation_id);