CREATE TABLE agent_tickets (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    bot_id UUID NOT NULL,

    conversation_id UUID NOT NULL,

    status TEXT DEFAULT 'open',

    assigned_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    resolved_at TIMESTAMPTZ,

    CONSTRAINT fk_ticket_bot
        FOREIGN KEY (bot_id)
        REFERENCES bots(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_tickets_bot
ON agent_tickets(bot_id);

CREATE INDEX idx_tickets_status
ON agent_tickets(status);

CREATE INDEX idx_tickets_conversation
ON agent_tickets(conversation_id);