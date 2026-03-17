CREATE TABLE messages (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    bot_id UUID NOT NULL,

    conversation_id UUID NOT NULL,

    sender TEXT NOT NULL,

    message_type TEXT DEFAULT 'text',

    message_text TEXT,

    metadata JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_messages_bot
        FOREIGN KEY (bot_id)
        REFERENCES bots(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_messages_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation
ON messages(conversation_id, created_at);

CREATE INDEX idx_messages_bot
ON messages(bot_id, created_at);

CREATE INDEX idx_messages_sender
ON messages(sender);