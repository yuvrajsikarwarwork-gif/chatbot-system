CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL,
    platform_user_id TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_contacts_bot
        FOREIGN KEY (bot_id)
        REFERENCES bots(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_contacts_bot_platform
        UNIQUE (bot_id, platform_user_id)
);

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS contact_id UUID,
    ADD COLUMN IF NOT EXISTS current_flow TEXT,
    ADD COLUMN IF NOT EXISTS current_node TEXT,
    ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_conversations_contact'
    ) THEN
        ALTER TABLE conversations
            ADD CONSTRAINT fk_conversations_contact
            FOREIGN KEY (contact_id)
            REFERENCES contacts(id)
            ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_bot_platform
ON contacts(bot_id, platform_user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_contact_channel
ON conversations(contact_id, channel);

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS channel TEXT,
    ADD COLUMN IF NOT EXISTS platform_user_id TEXT,
    ADD COLUMN IF NOT EXISTS content JSONB;

UPDATE messages
SET content = jsonb_build_object(
    'type', COALESCE(message_type, 'text'),
    'text', message_text
)
WHERE content IS NULL;
