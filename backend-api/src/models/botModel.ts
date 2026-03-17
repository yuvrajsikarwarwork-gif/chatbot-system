import { query } from "../config/db";

export async function findBotsByUser(userId: string) {
  // ✅ Sorting by 'active' status first ensures a better UX in the Instance Manager.
  const res = await query(
    "SELECT * FROM bots WHERE user_id = $1 ORDER BY status = 'active' DESC, created_at DESC",
    [userId]
  );
  return res.rows;
}

export async function findBotById(id: string) {
  const res = await query("SELECT * FROM bots WHERE id = $1", [id]);
  return res.rows[0];
}

export async function createBot(userId: string, name: string) {
  // ✅ Explicitly setting 'inactive' on creation prevents ghost triggers before configuration.
  const res = await query(
    "INSERT INTO bots (user_id, name, status) VALUES ($1, $2, 'inactive') RETURNING *",
    [userId, name]
  );
  return res.rows[0];
}

export async function updateBot(
  id: string,
  data: {
    name?: string;
    wa_phone_number_id?: string;
    wa_access_token?: string;
    trigger_keywords?: string;
    status?: string; 
  }
) {
  // ✅ The ::text casting prevents type-mismatch errors when passing nulls for UUID or JSON fields.
  const res = await query(
    `
    UPDATE bots
    SET 
      name = CASE WHEN $1::text IS NOT NULL THEN $1 ELSE name END,
      wa_phone_number_id = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE wa_phone_number_id END,
      wa_access_token = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE wa_access_token END,
      trigger_keywords = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE trigger_keywords END,
      status = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE status END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
    `,
    [
      data.name !== undefined ? data.name : null,
      data.wa_phone_number_id !== undefined ? data.wa_phone_number_id : null,
      data.wa_access_token !== undefined ? data.wa_access_token : null,
      data.trigger_keywords !== undefined ? data.trigger_keywords : null,
      data.status !== undefined ? data.status : null, 
      id
    ]
  );
  return res.rows[0];
}

export async function deleteBot(id: string) {
  await query("DELETE FROM bots WHERE id = $1", [id]);
}