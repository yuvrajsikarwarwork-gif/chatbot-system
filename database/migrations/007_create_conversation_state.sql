CREATE TABLE conversation_state (

    conversation_id UUID PRIMARY KEY,

    bot_id UUID NOT NULL,

    current_node TEXT,

    context_variables JSONB,

    last_intent TEXT,

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_state_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_state_bot
        FOREIGN KEY (bot_id)
        REFERENCES bots(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_state_bot
ON conversation_state(bot_id);