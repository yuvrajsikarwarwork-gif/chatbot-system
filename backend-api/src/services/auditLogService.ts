import { createAuditLog } from "../models/auditLogModel";
import { findActiveSupportAccess } from "../models/supportAccessModel";
import { query } from "../config/db";

export async function logAuditSafe(input: {
  userId?: string | null;
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
    let supportContext:
      | {
          actorUserId: string | null;
          impersonatedUserId: string | null;
          supportAccessId: string | null;
          metadata: Record<string, unknown>;
        }
      | null = null;

    if (input.userId && input.workspaceId) {
      const supportAccess = await findActiveSupportAccess(input.workspaceId, input.userId);
      if (supportAccess) {
        const workspaceRes = await query(
          `SELECT owner_user_id
           FROM workspaces
           WHERE id = $1
           LIMIT 1`,
          [input.workspaceId]
        );
        const impersonatedUserId = String(workspaceRes.rows[0]?.owner_user_id || "").trim() || null;
        supportContext = {
          actorUserId: input.userId,
          impersonatedUserId,
          supportAccessId: supportAccess.id,
          metadata: {
            support_mode: true,
            support_access_id: supportAccess.id,
            impersonated_workspace_id: input.workspaceId,
            impersonated_user_id: impersonatedUserId,
          },
        };
      }
    }

    await createAuditLog({
      ...input,
      actorUserId: supportContext?.actorUserId || input.userId || null,
      impersonatedUserId: supportContext?.impersonatedUserId || null,
      supportAccessId: supportContext?.supportAccessId || null,
      metadata: {
        ...(input.metadata || {}),
        ...(supportContext?.metadata || {}),
      },
    });
  } catch (err) {
    console.warn("Audit log skipped", err);
  }
}
