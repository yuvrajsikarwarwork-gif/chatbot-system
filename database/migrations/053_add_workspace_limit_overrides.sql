ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS agent_seat_limit_override INTEGER,
  ADD COLUMN IF NOT EXISTS project_limit_override INTEGER,
  ADD COLUMN IF NOT EXISTS active_bot_limit_override INTEGER,
  ADD COLUMN IF NOT EXISTS monthly_campaign_limit_override INTEGER,
  ADD COLUMN IF NOT EXISTS max_numbers_override INTEGER,
  ADD COLUMN IF NOT EXISTS ai_reply_limit_override INTEGER;
