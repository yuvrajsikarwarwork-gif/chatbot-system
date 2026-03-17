CREATE TABLE conversations (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    bot_id UUID NOT NULL,

    channel TEXT NOT NULL,

    user_identifier TEXT NOT NULL,

    status TEXT DEFAULT 'active',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_conversations_bot
        FOREIGN KEY (bot_id)
        REFERENCES bots(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_conversation_lookup
ON conversations(bot_id, channel, user_identifier);

CREATE INDEX idx_conversations_bot_id
ON conversations(bot_id);