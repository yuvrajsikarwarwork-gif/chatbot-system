import { query } from "../config/db";

export async function getPlatformSettingsRecord(settingsKey: string) {
  const res = await query(
    `SELECT *
     FROM platform_settings
     WHERE settings_key = $1
     LIMIT 1`,
    [settingsKey]
  );

  return res.rows[0] || null;
}

export async function upsertPlatformSettingsRecord(input: {
  settingsKey: string;
  settingsJson: Record<string, unknown>;
  userId?: string | null;
}) {
  const res = await query(
    `INSERT INTO platform_settings (settings_key, settings_json, created_by, updated_by)
     VALUES ($1, $2::jsonb, $3, $3)
     ON CONFLICT (settings_key)
     DO UPDATE SET
       settings_json = EXCLUDED.settings_json,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()
     RETURNING *`,
    [
      input.settingsKey,
      JSON.stringify(input.settingsJson || {}),
      input.userId || null,
    ]
  );

  return res.rows[0];
}
