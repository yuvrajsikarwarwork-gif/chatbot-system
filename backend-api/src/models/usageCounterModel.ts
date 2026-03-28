import { query } from "../config/db";

export async function incrementUsageCounter(input: {
  workspaceId: string;
  projectId?: string | null;
  metricKey: string;
  periodKey: string;
  quantity?: number;
  metadata?: Record<string, unknown> | null;
}) {
  const res = await query(
    `INSERT INTO workspace_usage_counters (
       workspace_id,
       project_id,
       metric_key,
       period_key,
       quantity,
       metadata
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (workspace_id, project_id, metric_key, period_key)
     DO UPDATE SET
       quantity = workspace_usage_counters.quantity + EXCLUDED.quantity,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()
     RETURNING *`,
    [
      input.workspaceId,
      input.projectId || null,
      input.metricKey,
      input.periodKey,
      Number(input.quantity || 1),
      JSON.stringify(input.metadata || {}),
    ]
  );

  return res.rows[0];
}

export async function listUsageCountersByWorkspace(input: {
  workspaceId: string;
  periodKey?: string | null;
}) {
  const params: any[] = [input.workspaceId];
  let whereClause = `WHERE workspace_id = $1`;

  if (input.periodKey) {
    params.push(input.periodKey);
    whereClause += ` AND period_key = $2`;
  }

  const res = await query(
    `SELECT *
     FROM workspace_usage_counters
     ${whereClause}
     ORDER BY metric_key ASC, project_id NULLS FIRST`,
    params
  );

  return res.rows;
}
