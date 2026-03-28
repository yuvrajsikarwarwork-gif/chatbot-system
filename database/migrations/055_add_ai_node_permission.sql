INSERT INTO permissions (key, name)
VALUES ('use_ai_nodes', 'Use AI nodes')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role, permission_key, allowed)
VALUES
  ('workspace_admin', 'use_ai_nodes', true),
  ('editor', 'use_ai_nodes', true),
  ('agent', 'use_ai_nodes', false),
  ('viewer', 'use_ai_nodes', false)
ON CONFLICT (role, permission_key) DO NOTHING;
