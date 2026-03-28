import { query } from "../config/db";

function isRecoverableAuditSchemaError(err: any) {
  return ["42703", "42P01"].includes(String(err?.code || ""));
}

export async function createAuditLog(input: {
  userId?: string | null;
  actorUserId?: string | null;
  impersonatedUserId?: string | null;
  supportAccessId?: string | null;
  workspaceId?: string | null;
  projectId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  try {
    const res = await query(
      `INSERT INTO audit_logs
         (
           user_id,
           actor_user_id,
           impersonated_user_id,
           support_access_id,
           workspace_id,
           project_id,
           action,
           entity,
           entity_id,
           old_data,
           new_data,
           metadata
         )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb)
       RETURNING *`,
      [
        input.userId || null,
        input.actorUserId || input.userId || null,
        input.impersonatedUserId || null,
        input.supportAccessId || null,
        input.workspaceId || null,
        input.projectId || null,
        input.action,
        input.entity,
        input.entityId,
        JSON.stringify(input.oldData || {}),
        JSON.stringify(input.newData || {}),
        JSON.stringify(input.metadata || {}),
      ]
    );

    return res.rows[0];
  } catch (err: any) {
    if (!isRecoverableAuditSchemaError(err)) {
      throw err;
    }

    const fallbackRes = await query(
      `INSERT INTO audit_logs
         (user_id, workspace_id, project_id, action, entity, entity_id, old_data, new_data, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb)
       RETURNING *`,
      [
        input.userId || input.actorUserId || null,
        input.workspaceId || null,
        input.projectId || null,
        input.action,
        input.entity,
        input.entityId,
        JSON.stringify(input.oldData || {}),
        JSON.stringify(input.newData || {}),
        JSON.stringify(input.metadata || {}),
      ]
    );

    return fallbackRes.rows[0];
  }
}

export async function listAuditLogs(filters: {
  workspaceId: string;
  projectId?: string | null;
  entity?: string | null;
  action?: string | null;
  actorUserId?: string | null;
  limit?: number;
}) {
  const params: Array<string | number | null> = [filters.workspaceId];
  const clauses = [`al.workspace_id = $1`];

  if (filters.projectId) {
    params.push(filters.projectId);
    clauses.push(`al.project_id = $${params.length}`);
  }
  if (filters.entity) {
    params.push(filters.entity);
    clauses.push(`al.entity = $${params.length}`);
  }
  if (filters.action) {
    params.push(filters.action);
    clauses.push(`al.action = $${params.length}`);
  }
  if (filters.actorUserId) {
    params.push(filters.actorUserId);
    clauses.push(`COALESCE(al.actor_user_id, al.user_id) = $${params.length}`);
  }

  params.push(Math.min(500, Math.max(1, Number(filters.limit || 200))));

  try {
    try {
      const res = await query(
        `SELECT
           al.*,
           u.name AS user_name,
           u.email AS user_email,
           actor.name AS actor_user_name,
           actor.email AS actor_user_email,
           impersonated.name AS impersonated_user_name,
           impersonated.email AS impersonated_user_email
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.user_id
         LEFT JOIN users actor ON actor.id = COALESCE(al.actor_user_id, al.user_id)
         LEFT JOIN users impersonated ON impersonated.id = al.impersonated_user_id
         WHERE ${clauses.join(" AND ")}
         ORDER BY al.created_at DESC
         LIMIT $${params.length}`,
        params
      );

      return res.rows;
    } catch (err: any) {
      if (!isRecoverableAuditSchemaError(err)) {
        throw err;
      }

      const fallbackRes = await query(
        `SELECT al.*, u.name AS user_name, u.email AS user_email
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.user_id
         WHERE ${clauses.join(" AND ")}
         ORDER BY al.created_at DESC
         LIMIT $${params.length}`,
        params
      );

      return fallbackRes.rows;
    }
  } catch (err: any) {
    if (["42P01", "42703", "42702"].includes(String(err?.code || ""))) {
      return [];
    }
    throw err;
  }
}

export async function listPlatformAuditLogs(filters: {
  entity?: string | null;
  action?: string | null;
  limit?: number;
}) {
  const params: Array<string | number> = [];
  const clauses: string[] = [];

  if (filters.entity) {
    params.push(filters.entity);
    clauses.push(`al.entity = $${params.length}`);
  }
  if (filters.action) {
    params.push(filters.action);
    clauses.push(`al.action = $${params.length}`);
  }

  params.push(Math.min(200, Math.max(1, Number(filters.limit || 20))));
  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  try {
    const res = await query(
      `SELECT
         al.*,
         u.name AS user_name,
         u.email AS user_email,
         actor.name AS actor_user_name,
         actor.email AS actor_user_email,
         impersonated.name AS impersonated_user_name,
         impersonated.email AS impersonated_user_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       LEFT JOIN users actor ON actor.id = COALESCE(al.actor_user_id, al.user_id)
       LEFT JOIN users impersonated ON impersonated.id = al.impersonated_user_id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${params.length}`,
      params
    );

    return res.rows;
  } catch (err: any) {
    if (["42P01", "42703", "42702"].includes(String(err?.code || ""))) {
      return [];
    }
    throw err;
  }
}
