import { query } from "../config/db";

export async function findFlowsByBot(botId: string) {
  const res = await query(
    "SELECT * FROM flows WHERE bot_id = $1 ORDER BY created_at DESC",
    [botId]
  );
  return res.rows;
}

export async function findFlowById(id: string) {
  const res = await query(
    "SELECT * FROM flows WHERE id = $1",
    [id]
  );
  return res.rows[0];
}

/**
 * UPSERT LOGIC: Handles both creation and updates.
 * Safely stringifies the entire flow object into the single flow_json column.
 */
export async function createFlow(
  botId: string,
  flowJson: any
) {
  const flowJsonStr = JSON.stringify(flowJson || { nodes: [], edges: [] });

  const res = await query(
    `
    INSERT INTO flows (bot_id, flow_json)
    VALUES ($1, $2::jsonb)
    ON CONFLICT (bot_id) 
    DO UPDATE SET 
      flow_json = EXCLUDED.flow_json, 
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [botId, flowJsonStr]
  );

  return res.rows[0];
}

export async function updateFlow(
  id: string,
  flowJson: any
) {
  const flowJsonStr = JSON.stringify(flowJson || { nodes: [], edges: [] });

  const res = await query(
    `
    UPDATE flows
    SET flow_json = $1::jsonb
    WHERE id = $2
    RETURNING *
    `,
    [flowJsonStr, id]
  );

  return res.rows[0];
}

export async function deleteFlow(id: string) {
  await query(
    "DELETE FROM flows WHERE id = $1",
    [id]
  );
}