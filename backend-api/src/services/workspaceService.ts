import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, query } from "../config/db";
import { findPlanById } from "../models/planModel";
import {
  createBillingSubscription,
  findCurrentBillingSubscriptionByWorkspace,
  updateBillingSubscription,
} from "../models/billingSubscriptionModel";
import {
  deleteSupportAccess,
  listSupportAccessByWorkspace,
  upsertSupportAccess,
} from "../models/supportAccessModel";
import {
  createSupportRequest,
  findSupportRequestById,
  listSupportRequestsByWorkspace,
  updateSupportRequestStatus,
} from "../models/supportRequestModel";
import { upsertWorkspaceMembership } from "../models/workspaceMembershipModel";
import {
  createWorkspace,
  findWorkspaceById,
  findWorkspacesByUser,
  updateWorkspace,
} from "../models/workspaceModel";
import { assertRecord } from "../utils/assertRecord";
import {
  assignWorkspaceMemberService,
  assertPlatformRoles,
  isPlatformInternalOperator,
  assertWorkspacePermission,
  listWorkspaceMembersService,
  WORKSPACE_PERMISSIONS,
} from "./workspaceAccessService";
import { logAuditSafe } from "./auditLogService";
import { getWorkspaceWalletSummary } from "./walletService";
import { createWalletAdjustment } from "./walletService";
import { ingestDocumentEmbeddings } from "./documentIngestionService";
import { retrieveKnowledgeForWorkspace } from "./ragService";
import { repairWhatsAppContactDuplicates } from "./contactMergeService";
import { createWorkspaceInviteService } from "./inviteService";
import {
  recordWorkspaceUsage,
  resolvePlanLimit,
  resolveWorkspacePlanLimit,
  syncWorkspaceSeatQuantity,
} from "./billingService";

function normalizeWorkspaceStatus(status?: string) {
  const value = String(status || "active").trim().toLowerCase();
  const allowed = new Set(["active", "inactive", "paused", "locked", "suspended"]);
  if (!allowed.has(value)) {
    throw { status: 400, message: `Unsupported workspace status '${status}'` };
  }

  return value;
}

function normalizeBillingCycle(value?: string) {
  const normalized = String(value || "monthly").trim().toLowerCase();
  if (!["monthly", "yearly"].includes(normalized)) {
    throw { status: 400, message: `Unsupported billing cycle '${value}'` };
  }

  return normalized;
}

function normalizeLimitOverride(value: unknown, label: string) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }

  const next = Number(value);
  if (!Number.isFinite(next) || next <= 0 || !Number.isInteger(next)) {
    throw { status: 400, message: `${label} must be a positive whole number or blank` };
  }

  return next;
}

function normalizeCurrency(value?: string) {
  return String(value || "INR").trim().toUpperCase() || "INR";
}

function resolveBasePlanPrice(plan: any, billingCycle: string, currency: string) {
  const normalizedCurrency = normalizeCurrency(currency);
  if (normalizedCurrency === "USD") {
    return Number(
      billingCycle === "yearly" ? plan?.yearly_price_usd || 0 : plan?.monthly_price_usd || 0
    );
  }

  return Number(
    billingCycle === "yearly" ? plan?.yearly_price_inr || 0 : plan?.monthly_price_inr || 0
  );
}

export async function listWorkspacesService(userId: string) {
  const rows = await findWorkspacesByUser(userId);
  const platformOperator = await isPlatformInternalOperator(userId);
  return rows.map((row: any) => sanitizeWorkspaceBillingFields(row, platformOperator));
}

export async function getWorkspaceByIdService(workspaceId: string, userId: string) {
  const workspace = assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  return sanitizeWorkspaceBillingFields(
    workspace,
    await isPlatformInternalOperator(userId)
  );
}

function sanitizeWorkspaceBillingFields<T extends Record<string, any>>(workspace: T, canViewBilling: boolean): T {
  if (canViewBilling) {
    return workspace;
  }

  const clone: Record<string, any> = { ...workspace };
  const sensitiveKeys = [
    "subscription_id",
    "subscription_status",
    "expiry_date",
    "grace_period_end",
    "billing_cycle",
    "currency",
    "price_amount",
    "auto_renew",
    "subscription_plan_name",
    "seat_quantity",
    "included_seat_limit",
    "extra_seat_quantity",
    "extra_seat_unit_price",
    "ai_reply_limit",
    "ai_overage_unit_price",
    "wallet_auto_topup_enabled",
    "wallet_auto_topup_amount",
    "wallet_low_balance_threshold",
    "external_customer_ref",
    "external_subscription_ref",
    "current_period_start",
    "current_period_end",
    "trial_ends_at",
    "canceled_at",
    "billing_metadata",
  ];

  for (const key of sensitiveKeys) {
    if (key in clone) {
      clone[key] = null;
    }
  }

  return clone as T;
}

export async function getWorkspaceOverviewService(workspaceId: string, userId: string) {
  const canViewBilling = await isPlatformInternalOperator(userId);
  const workspace = assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  await assertWorkspacePermission(userId, workspaceId, WORKSPACE_PERMISSIONS.viewWorkspace);

  const [countsRes, walletSummary, supportRequests] = await Promise.all([
    query(
      `SELECT
         (SELECT COUNT(*)::int FROM workspace_memberships WHERE workspace_id = $1 AND status = 'active') AS member_count,
         (SELECT COUNT(*)::int FROM projects WHERE workspace_id = $1) AS project_count,
         (SELECT COUNT(*)::int FROM bots WHERE workspace_id = $1) AS bot_count,
         (SELECT COUNT(*)::int FROM flows f JOIN bots b ON b.id = f.bot_id WHERE b.workspace_id = $1) AS flow_count,
         (SELECT COUNT(*)::int FROM campaigns WHERE workspace_id = $1) AS campaign_count,
         (SELECT COUNT(*)::int FROM platform_accounts WHERE workspace_id = $1) AS platform_account_count,
         (SELECT COUNT(*)::int FROM conversations WHERE workspace_id = $1) AS conversation_count,
         (SELECT COUNT(*)::int FROM conversations WHERE workspace_id = $1 AND status IN ('active', 'agent_pending')) AS open_conversation_count,
         (SELECT COUNT(*)::int FROM leads WHERE workspace_id = $1) AS lead_count,
         (SELECT COUNT(*)::int FROM support_requests WHERE workspace_id = $1 AND status = 'open') AS open_support_request_count,
         (SELECT COUNT(*)::int FROM support_access WHERE workspace_id = $1 AND expires_at > NOW()) AS active_support_access_count`,
      [workspaceId]
    ),
    (canViewBilling
      ? getWorkspaceWalletSummary({ workspaceId, limit: 5 })
      : Promise.resolve({
          enabled: false,
          balance: 0,
          totalCredits: 0,
          totalDebits: 0,
          recentTransactions: [],
        })
    ).catch(() => ({
      enabled: false,
      balance: 0,
      totalCredits: 0,
      totalDebits: 0,
      recentTransactions: [],
    })),
    listSupportRequestsByWorkspace(workspaceId).catch(() => []),
  ]);

  const counts = countsRes.rows[0] || {};
  const limits = {
    users:
      resolveWorkspacePlanLimit(workspace as any, workspace as any, workspace as any, "agent_seat_limit", null) ||
      Number((workspace as any).max_users || 0) ||
      null,
    projects:
      resolveWorkspacePlanLimit(workspace as any, workspace as any, workspace as any, "project_limit", null) ||
      Number((workspace as any).max_projects || 0) ||
      null,
    campaigns:
      resolveWorkspacePlanLimit(workspace as any, workspace as any, workspace as any, "monthly_campaign_limit", null) ||
      Number((workspace as any).max_campaigns || 0) ||
      null,
    integrations:
      resolveWorkspacePlanLimit(workspace as any, workspace as any, workspace as any, "max_numbers", null) ||
      Number((workspace as any).max_integrations || 0) ||
      Number((workspace as any).max_numbers || 0) ||
      null,
    bots:
      resolveWorkspacePlanLimit(workspace as any, workspace as any, workspace as any, "active_bot_limit", null) ||
      Number((workspace as any).max_bots || 0) ||
      null,
  };

  return {
    workspace: sanitizeWorkspaceBillingFields(workspace, canViewBilling),
    metrics: {
      members: Number(counts.member_count || 0),
      projects: Number(counts.project_count || 0),
      bots: Number(counts.bot_count || 0),
      flows: Number(counts.flow_count || 0),
      campaigns: Number(counts.campaign_count || 0),
      integrations: Number(counts.platform_account_count || 0),
      conversations: Number(counts.conversation_count || 0),
      openConversations: Number(counts.open_conversation_count || 0),
      leads: Number(counts.lead_count || 0),
      openSupportRequests: Number(counts.open_support_request_count || 0),
    },
    limits,
    wallet: walletSummary,
    support: {
      totalRequests: Array.isArray(supportRequests) ? supportRequests.length : 0,
      openRequests: Array.isArray(supportRequests)
        ? supportRequests.filter((row: any) => String(row?.status || "").toLowerCase() === "open").length
        : 0,
      activeAccess: Number(counts.active_support_access_count || 0),
    },
  };
}

export async function getWorkspaceWalletService(workspaceId: string, userId: string) {
  await assertPlatformRoles(userId, ["super_admin", "developer"]);
  assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  return getWorkspaceWalletSummary({ workspaceId, limit: 20 });
}

export async function getWorkspaceBillingContextService(workspaceId: string, userId: string) {
  await assertPlatformRoles(userId, ["super_admin", "developer"]);
  const workspace = assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  const wallet = await getWorkspaceWalletSummary({ workspaceId, limit: 20 });
  return { workspace, wallet };
}

export async function ingestWorkspaceKnowledgeService(
  workspaceId: string,
  userId: string,
  payload: {
    projectId?: string | null;
    sourceType?: string;
    sourceRef?: string | null;
    title?: string | null;
    content?: string;
    metadata?: Record<string, unknown> | null;
    embedding?: number[] | null;
    chunkSize?: number;
    chunkOverlap?: number;
    replaceExisting?: boolean;
  }
) {
  assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  await assertWorkspacePermission(userId, workspaceId, WORKSPACE_PERMISSIONS.manageWorkspace);

  const sourceType = String(payload.sourceType || "").trim().toLowerCase();
  const content = String(payload.content || "").trim();

  if (!sourceType) {
    throw { status: 400, message: "sourceType is required" };
  }

  if (!content) {
    throw { status: 400, message: "content is required" };
  }

  if (payload.projectId) {
    const projectRes = await query(
      `SELECT id
       FROM projects
       WHERE id = $1
         AND workspace_id = $2
       LIMIT 1`,
      [payload.projectId, workspaceId]
    );

    if (!projectRes.rows[0]) {
      throw { status: 404, message: "Project not found in this workspace" };
    }
  }

  return ingestDocumentEmbeddings({
    workspaceId,
    projectId: String(payload.projectId || "").trim() || null,
    sourceType,
    sourceRef: String(payload.sourceRef || "").trim() || null,
    title: String(payload.title || "").trim() || null,
    content,
    metadata: payload.metadata || null,
    embedding: Array.isArray(payload.embedding) ? payload.embedding : null,
    replaceExisting: payload.replaceExisting !== false,
    ...(payload.chunkSize !== undefined ? { chunkSize: payload.chunkSize } : {}),
    ...(payload.chunkOverlap !== undefined ? { chunkOverlap: payload.chunkOverlap } : {}),
  });
}

export async function searchWorkspaceKnowledgeService(
  workspaceId: string,
  userId: string,
  input: {
    projectId?: string | null;
    queryText?: string;
    limit?: number;
    embedding?: number[] | null;
  }
) {
  assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  await assertWorkspacePermission(userId, workspaceId, WORKSPACE_PERMISSIONS.viewWorkspace);

  const queryText = String(input.queryText || "").trim();
  if (!queryText) {
    throw { status: 400, message: "query is required" };
  }

  if (input.projectId) {
    const projectRes = await query(
      `SELECT id
       FROM projects
       WHERE id = $1
         AND workspace_id = $2
       LIMIT 1`,
      [input.projectId, workspaceId]
    );

    if (!projectRes.rows[0]) {
      throw { status: 404, message: "Project not found in this workspace" };
    }
  }

  const chunks = await retrieveKnowledgeForWorkspace({
    workspaceId,
    projectId: String(input.projectId || "").trim() || null,
    query: queryText,
    embedding: Array.isArray(input.embedding) ? input.embedding : null,
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
  });

  return {
    query: queryText,
    count: chunks.length,
    chunks,
  };
}

export async function repairWorkspaceWhatsAppContactsService(
  workspaceId: string,
  userId: string,
  payload: {
    botId?: string | null;
    projectId?: string | null;
    dryRun?: boolean;
  }
) {
  assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  await assertWorkspacePermission(userId, workspaceId, WORKSPACE_PERMISSIONS.manageWorkspace);

  return repairWhatsAppContactDuplicates({
    workspaceId,
    botId: String(payload.botId || "").trim() || null,
    projectId: String(payload.projectId || "").trim() || null,
    dryRun: payload.dryRun === true,
  });
}

export async function createWorkspaceWalletAdjustmentService(
  workspaceId: string,
  userId: string,
  payload: {
    transactionType?: string;
    amount?: number;
    note?: string;
    projectId?: string | null;
    externalRef?: string | null;
  }
) {
  assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  await assertPlatformRoles(userId, ["super_admin", "developer"]);

  const transactionType = String(payload.transactionType || "credit").trim().toLowerCase();
  if (!["credit", "debit", "adjustment"].includes(transactionType)) {
    throw { status: 400, message: "Unsupported wallet transaction type." };
  }

  return createWalletAdjustment({
    workspaceId,
    projectId: String(payload.projectId || "").trim() || null,
    actorUserId: userId,
    transactionType: transactionType as "credit" | "debit" | "adjustment",
    amount: Number(payload.amount),
    ...(payload.note !== undefined ? { note: payload.note || null } : {}),
    ...(payload.externalRef !== undefined ? { externalRef: payload.externalRef || null } : {}),
  });
}

export async function createWorkspaceService(userId: string, payload: any) {
  await assertPlatformRoles(userId, ["super_admin", "developer"]);

  const companyName = String(payload.name || payload.companyName || "").trim();
  const ownerName = String(payload.ownerName || payload.fullName || "").trim();
  const ownerEmail = String(payload.ownerEmail || payload.email || "").trim().toLowerCase();
  const ownerPhone = String(payload.ownerPhone || payload.phoneNumber || "").trim() || null;
  const billingCycle = normalizeBillingCycle(payload.billingCycle);
  const currency = normalizeCurrency(payload.currency || "INR");
  const plan = await findPlanById(payload.planId || "starter");

  if (!companyName) {
    throw { status: 400, message: "Company name is required" };
  }
  if (!plan) {
    throw { status: 404, message: "Plan not found" };
  }
  if (!payload.ownerUserId && (!ownerName || !ownerEmail)) {
    throw { status: 400, message: "Primary account owner name and email are required" };
  }

  const client = await db.connect();
  let inviteDetails: { inviteLink: string; expiresAt: string } | null = null;
  let committed = false;

  try {
    await client.query("BEGIN");

    let ownerUserId = String(payload.ownerUserId || "").trim() || null;
    let ownerUser: any = null;
    let createdNewOwner = false;

    if (ownerUserId) {
      const ownerRes = await client.query(
        `SELECT id, email, name, phone_number
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [ownerUserId]
      );
      ownerUser = ownerRes.rows[0] || null;
      if (!ownerUser) {
        throw { status: 404, message: "Workspace owner not found" };
      }
    } else {
      const ownerRes = await client.query(
        `SELECT id, email, name, phone_number
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [ownerEmail]
      );
      ownerUser = ownerRes.rows[0] || null;

      if (!ownerUser) {
        const temporaryPassword = crypto.randomBytes(12).toString("base64url");
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);
        const createdUserRes = await client.query(
          `INSERT INTO users (id, email, password_hash, name, role, phone_number)
           VALUES (gen_random_uuid(), $1, $2, $3, 'user', $4)
           RETURNING id, email, name, phone_number`,
          [ownerEmail, passwordHash, ownerName, ownerPhone]
        );
        ownerUser = createdUserRes.rows[0];
        createdNewOwner = true;
      } else {
        await client.query(
          `UPDATE users
           SET
             name = COALESCE(NULLIF($1, ''), name),
             phone_number = COALESCE(NULLIF($2, ''), phone_number)
           WHERE id = $3`,
          [ownerName, ownerPhone, ownerUser.id]
        );
      }

      ownerUserId = ownerUser.id;
    }

    const workspaceRes = await client.query(
      `INSERT INTO workspaces
         (name, owner_user_id, plan_id, status, company_website, industry, tax_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        companyName,
        ownerUserId,
        payload.planId || "starter",
        normalizeWorkspaceStatus(payload.status),
        String(payload.companyWebsite || "").trim() || null,
        String(payload.industry || payload.category || "").trim() || null,
        String(payload.taxId || payload.gstin || "").trim() || null,
      ]
    );
    const workspace = workspaceRes.rows[0];

    await client.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role, status, created_by)
       VALUES ($1, $2, 'admin', $3, $4)
       ON CONFLICT (workspace_id, user_id)
       DO UPDATE SET role = 'admin', status = EXCLUDED.status, updated_at = NOW()`,
      [workspace.id, ownerUserId, createdNewOwner ? "invited" : "active", userId]
    );

    await client.query(
      `UPDATE users
       SET workspace_id = COALESCE(workspace_id, $1),
           phone_number = COALESCE(phone_number, $2)
       WHERE id = $3`,
      [workspace.id, ownerPhone, ownerUserId]
    );

    const includedSeatLimit =
      resolveWorkspacePlanLimit(payload, plan, null, "agent_seat_limit", null) ||
      Number(plan.included_users || plan.max_users || 1);
    const createdBillingRes = await client.query(
      `INSERT INTO billing_subscriptions (
         workspace_id,
         plan_id,
         status,
         billing_cycle,
         currency,
         base_price_amount,
         seat_quantity,
         included_seat_limit,
         extra_seat_quantity,
         extra_seat_unit_price,
         ai_reply_limit,
         ai_overage_unit_price,
         metadata
       ) VALUES (
         $1, $2, 'active', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb
       )
       RETURNING *`,
      [
        workspace.id,
        plan.id,
        billingCycle,
        currency,
        resolveBasePlanPrice(plan, billingCycle, currency),
        1,
        includedSeatLimit,
        Math.max(0, 1 - Number(includedSeatLimit || 0)),
        Number(plan.extra_agent_seat_price_inr || 0),
        resolveWorkspacePlanLimit(payload, plan, null, "ai_reply_limit", null),
        Number(payload.aiOverageUnitPrice || 0),
        JSON.stringify({
          created_from: "workspace_create",
        }),
      ]
    );
    const createdBilling = createdBillingRes.rows[0];

    const initialWalletTopup = Number(payload.initialWalletTopup || payload.initialWalletCredit || 0);
    await client.query(
      `INSERT INTO wallet_transactions (
         workspace_id,
         billing_subscription_id,
         platform,
         transaction_type,
         entry_kind,
         pricing_category,
         unit_type,
         unit_count,
         amount,
         currency,
         balance_after,
         reference_type,
         reference_id,
         metadata,
         created_by
       ) VALUES (
         $1, $2, 'wallet', $3, 'wallet', $4, 'workspace', 1, $5, $6, $7, 'workspace', $1, $8::jsonb, $9
       )`,
      [
        workspace.id,
        createdBilling?.id || null,
        initialWalletTopup > 0 ? "credit" : "adjustment",
        initialWalletTopup > 0 ? "initial_topup" : "ledger_seed",
        Math.max(0, initialWalletTopup),
        currency,
        Math.max(0, initialWalletTopup),
        JSON.stringify({
          source: "workspace_create",
          note: initialWalletTopup > 0 ? "Initial wallet top-up" : "Ledger initialized",
        }),
        userId,
      ]
    );

    await client.query("COMMIT");
    committed = true;

    await syncWorkspaceSeatQuantity(workspace.id);
    await recordWorkspaceUsage({
      workspaceId: workspace.id,
      metricKey: "seat_changes",
      metadata: {
        action: "workspace_created",
        seatQuantity: 1,
      },
    });

    if (createdNewOwner || String(payload.sendInvite || "").trim() !== "false") {
      const inviteEmail = String(ownerEmail || ownerUser?.email || "").trim().toLowerCase();
      if (!inviteEmail || !ownerUserId) {
        throw { status: 400, message: "Owner email is required to send an invite." };
      }
      try {
        inviteDetails = await createWorkspaceInviteService({
          userId: ownerUserId,
          email: inviteEmail,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          role: "admin",
          createdBy: userId,
        });
      } catch (inviteError: any) {
        console.error(
          `[WorkspaceService] Workspace ${workspace.id} created but invite delivery failed: ${inviteError?.message || inviteError}`
        );
      }
    }

    await logAuditSafe({
      userId,
      workspaceId: workspace.id,
      action: "create",
      entity: "workspace",
      entityId: workspace.id,
      newData: {
        ...workspace,
        invite_sent: Boolean(inviteDetails),
      },
    });

    const created = assertRecord(await findWorkspaceById(workspace.id, userId), "Workspace not found");
    return {
      ...created,
      invite_link: inviteDetails?.inviteLink,
      invite_expires_at: inviteDetails?.expiresAt,
      invite_failed: !inviteDetails && Boolean(createdNewOwner || String(payload.sendInvite || "").trim() !== "false"),
    };
  } catch (error) {
    if (!committed) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function updateWorkspaceService(id: string, userId: string, payload: any) {
  const existing = assertRecord(await findWorkspaceById(id, userId), "Workspace not found");
  await assertPlatformRoles(userId, ["super_admin", "developer"]);
  const updatePayload: Record<string, unknown> = {};
  let hasLimitOverrideUpdate = false;

  if (payload.name !== undefined) updatePayload.name = payload.name;
  if (payload.planId !== undefined) {
    const plan = await findPlanById(payload.planId);
    if (!plan) {
      throw { status: 404, message: "Plan not found" };
    }
    updatePayload.planId = payload.planId;
  }
  if (payload.status !== undefined) {
    updatePayload.status = normalizeWorkspaceStatus(payload.status);
  }
  if (payload.lockReason !== undefined) {
    updatePayload.lockReason = payload.lockReason;
  }
  const overrideEntries = [
    ["agentSeatLimitOverride", "Agent seat limit override"],
    ["projectLimitOverride", "Project limit override"],
    ["activeBotLimitOverride", "Active bot limit override"],
    ["monthlyCampaignLimitOverride", "Monthly campaign limit override"],
    ["maxNumbersOverride", "Integration limit override"],
    ["aiReplyLimitOverride", "AI reply limit override"],
  ] as const;
  for (const [key, label] of overrideEntries) {
    if (payload[key] !== undefined) {
      updatePayload[key] = normalizeLimitOverride(payload[key], label);
      hasLimitOverrideUpdate = true;
    }
  }

  const updated = await updateWorkspace(id, userId, updatePayload);

  if (updated && (payload.planId !== undefined || hasLimitOverrideUpdate)) {
    const billing = await findCurrentBillingSubscriptionByWorkspace(id);
    const plan = await findPlanById(String(payload.planId || billing?.plan_id || updated.plan_id || ""));
    if (billing && plan) {
      await updateBillingSubscription(billing.id, {
        ...(payload.planId !== undefined ? { planId: String(payload.planId) } : {}),
        basePriceAmount: resolveBasePlanPrice(
          plan,
          String(billing.billing_cycle || "monthly"),
            String(billing.currency || "INR")
          ),
          includedSeatLimit:
            resolveWorkspacePlanLimit(updated || existing, plan, billing, "agent_seat_limit", null) ||
            Number(plan.included_users || plan.max_users || 0),
          extraSeatUnitPrice: Number(plan.extra_agent_seat_price_inr || 0),
          aiReplyLimit: resolveWorkspacePlanLimit(updated || existing, plan, billing, "ai_reply_limit", null),
        });
      }
    }

  await logAuditSafe({
    userId,
    workspaceId: id,
    action: "update",
    entity: "workspace",
    entityId: id,
    oldData: existing,
    newData: updated || {},
  });
  return updated;
}

function normalizeSubscriptionStatus(status?: string) {
  const value = String(status || "").trim().toLowerCase();
  const allowed = new Set([
    "active",
    "trialing",
    "overdue",
    "expired",
    "canceled",
    "locked",
  ]);
  if (!allowed.has(value)) {
    throw { status: 400, message: `Unsupported subscription status '${status}'` };
  }

  return value;
}

export async function updateWorkspaceBillingService(
  workspaceId: string,
  userId: string,
  payload: any
) {
  const workspace = assertRecord(
    await findWorkspaceById(workspaceId, userId),
    "Workspace not found"
  );
  await assertPlatformRoles(userId, ["super_admin", "developer"]);

  const billingCycle = payload.billingCycle !== undefined ? normalizeBillingCycle(payload.billingCycle) : undefined;
  const currency = payload.currency !== undefined ? normalizeCurrency(payload.currency) : undefined;
  const subscriptionUpdate: Record<string, unknown> = {};
  if (payload.subscriptionStatus !== undefined) {
    subscriptionUpdate.status = normalizeSubscriptionStatus(payload.subscriptionStatus);
  }
  if (billingCycle !== undefined) {
    subscriptionUpdate.billingCycle = billingCycle;
  }
  if (currency !== undefined) {
    subscriptionUpdate.currency = currency;
  }
  if (payload.basePriceAmount !== undefined || payload.priceAmount !== undefined) {
    subscriptionUpdate.basePriceAmount = Number(payload.basePriceAmount ?? payload.priceAmount);
  }
  if (payload.expiryDate !== undefined || payload.currentPeriodEnd !== undefined) {
    subscriptionUpdate.currentPeriodEnd = payload.currentPeriodEnd || payload.expiryDate || null;
  }
  if (payload.currentPeriodStart !== undefined) {
    subscriptionUpdate.currentPeriodStart = payload.currentPeriodStart || null;
  }
  if (payload.trialEndsAt !== undefined) {
    subscriptionUpdate.trialEndsAt = payload.trialEndsAt || null;
  }
  if (payload.canceledAt !== undefined) {
    subscriptionUpdate.canceledAt = payload.canceledAt || null;
  }
  if (payload.seatQuantity !== undefined) {
    subscriptionUpdate.seatQuantity = Number(payload.seatQuantity);
  }
  if (payload.includedSeatLimit !== undefined) {
    subscriptionUpdate.includedSeatLimit = Number(payload.includedSeatLimit);
  }
  if (payload.extraSeatQuantity !== undefined) {
    subscriptionUpdate.extraSeatQuantity = Number(payload.extraSeatQuantity);
  }
  if (payload.extraSeatUnitPrice !== undefined) {
    subscriptionUpdate.extraSeatUnitPrice = Number(payload.extraSeatUnitPrice);
  }
  if (payload.aiReplyLimit !== undefined) {
    subscriptionUpdate.aiReplyLimit = payload.aiReplyLimit === null ? null : Number(payload.aiReplyLimit);
  }
  if (payload.aiOverageUnitPrice !== undefined) {
    subscriptionUpdate.aiOverageUnitPrice = Number(payload.aiOverageUnitPrice);
  }
  if (payload.walletAutoTopupEnabled !== undefined) {
    subscriptionUpdate.walletAutoTopupEnabled = Boolean(payload.walletAutoTopupEnabled);
  }
  if (payload.walletAutoTopupAmount !== undefined) {
    subscriptionUpdate.walletAutoTopupAmount = payload.walletAutoTopupAmount === null ? null : Number(payload.walletAutoTopupAmount);
  }
  if (payload.walletLowBalanceThreshold !== undefined) {
    subscriptionUpdate.walletLowBalanceThreshold = payload.walletLowBalanceThreshold === null ? null : Number(payload.walletLowBalanceThreshold);
  }
  if (payload.externalCustomerRef !== undefined) {
    subscriptionUpdate.externalCustomerRef = payload.externalCustomerRef || null;
  }
  if (payload.externalSubscriptionRef !== undefined) {
    subscriptionUpdate.externalSubscriptionRef = payload.externalSubscriptionRef || null;
  }
  if (payload.metadata !== undefined) {
    subscriptionUpdate.metadata = payload.metadata;
  }
  if (payload.planId !== undefined) {
    const plan = await findPlanById(String(payload.planId || ""));
    if (!plan) {
      throw { status: 404, message: "Plan not found" };
    }
    subscriptionUpdate.planId = String(payload.planId);
    if (subscriptionUpdate.basePriceAmount === undefined) {
      subscriptionUpdate.basePriceAmount = resolveBasePlanPrice(
        plan,
        billingCycle || "monthly",
        currency || "INR"
      );
    }
    if (subscriptionUpdate.includedSeatLimit === undefined) {
      subscriptionUpdate.includedSeatLimit =
        resolveWorkspacePlanLimit(workspace, plan, null, "agent_seat_limit", null) ||
        Number(plan.included_users || plan.max_users || 0);
    }
    if (subscriptionUpdate.extraSeatUnitPrice === undefined) {
      subscriptionUpdate.extraSeatUnitPrice = Number(plan.extra_agent_seat_price_inr || 0);
    }
    if (subscriptionUpdate.aiReplyLimit === undefined) {
      subscriptionUpdate.aiReplyLimit = resolveWorkspacePlanLimit(workspace, plan, null, "ai_reply_limit", null);
    }
  }

  let subscription = await findCurrentBillingSubscriptionByWorkspace(workspaceId);
  if (!subscription) {
    const planId = String(payload.planId || workspace.plan_id || "starter");
    const plan = await findPlanById(planId);
    if (!plan) {
      throw { status: 404, message: "Workspace plan not found" };
    }
    subscription = await createBillingSubscription({
      workspaceId,
      planId,
      status: normalizeSubscriptionStatus(payload.subscriptionStatus || "active"),
      billingCycle: billingCycle || "monthly",
      currency: currency || "INR",
      basePriceAmount:
        Number(subscriptionUpdate.basePriceAmount) ||
        resolveBasePlanPrice(plan, billingCycle || "monthly", currency || "INR"),
      seatQuantity: Number(payload.seatQuantity || 0),
      includedSeatLimit:
        Number(subscriptionUpdate.includedSeatLimit) ||
        resolveWorkspacePlanLimit(workspace, plan, null, "agent_seat_limit", null) ||
        Number(plan.included_users || plan.max_users || 0),
      extraSeatQuantity: Number(payload.extraSeatQuantity || 0),
      extraSeatUnitPrice: Number(subscriptionUpdate.extraSeatUnitPrice || plan.extra_agent_seat_price_inr || 0),
      aiReplyLimit:
        subscriptionUpdate.aiReplyLimit === null
          ? null
          : Number(
              subscriptionUpdate.aiReplyLimit ||
                resolveWorkspacePlanLimit(workspace, plan, null, "ai_reply_limit", null) ||
                0
            ),
      aiOverageUnitPrice: Number(subscriptionUpdate.aiOverageUnitPrice || 0),
      metadata: (subscriptionUpdate.metadata as Record<string, unknown>) || {},
    });
  } else {
    subscription = await updateBillingSubscription(subscription.id, subscriptionUpdate);
  }

  if (payload.workspaceStatus !== undefined || payload.lockReason !== undefined) {
    const workspaceUpdate: Record<string, unknown> = {};
    if (payload.workspaceStatus !== undefined) {
      workspaceUpdate.status = normalizeWorkspaceStatus(payload.workspaceStatus);
    }
    if (payload.lockReason !== undefined) {
      workspaceUpdate.lockReason = payload.lockReason;
    }

    await updateWorkspace(workspaceId, userId, {
      ...workspaceUpdate,
    });
  }

  const updatedWorkspace = assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  await syncWorkspaceSeatQuantity(workspaceId);
  await logAuditSafe({
    userId,
    workspaceId,
    action: "update_billing",
    entity: "workspace_subscription",
    entityId: workspaceId,
    oldData: workspace,
    newData: {
      subscription,
      workspace: updatedWorkspace,
    },
  });
  return updatedWorkspace;
}

export async function lockWorkspaceService(
  workspaceId: string,
  userId: string,
  payload: { reason?: string; subscriptionStatus?: string; lockAt?: string | null }
) {
  return updateWorkspaceBillingService(workspaceId, userId, {
    subscriptionStatus: payload.subscriptionStatus || "locked",
    workspaceStatus: "locked",
    lockReason: payload.reason || "Locked by workspace admin",
    lockAt: payload.lockAt === undefined ? new Date().toISOString() : payload.lockAt,
  });
}

export async function unlockWorkspaceService(
  workspaceId: string,
  userId: string,
  payload: { subscriptionStatus?: string; gracePeriodEnd?: string | null } = {}
) {
  return updateWorkspaceBillingService(workspaceId, userId, {
    subscriptionStatus: payload.subscriptionStatus || "active",
    workspaceStatus: "active",
    lockReason: "",
    lockAt: null,
    gracePeriodEnd:
      payload.gracePeriodEnd === undefined ? null : payload.gracePeriodEnd,
  });
}

export async function assignUserWorkspaceService(
  workspaceId: string,
  userId: string,
  payload: { userId?: string; email?: string; role?: string; status?: string }
) {
  assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  return assignWorkspaceMemberService(workspaceId, userId, payload);
}

export async function removeUserWorkspaceService(
  workspaceId: string,
  actorUserId: string,
  targetUserId: string
) {
  assertRecord(await findWorkspaceById(workspaceId, actorUserId), "Workspace not found");
  await assertWorkspacePermission(
    actorUserId,
    workspaceId,
    WORKSPACE_PERMISSIONS.manageUsers
  );

  const existingMembership = await query(
    `SELECT *
     FROM workspace_memberships
     WHERE workspace_id = $1
       AND user_id = $2
     LIMIT 1`,
    [workspaceId, targetUserId]
  );
  const membership = existingMembership.rows[0];
  if (!membership) {
    throw { status: 404, message: "Workspace member not found" };
  }

  if (String(membership.role || "") === "workspace_owner") {
    throw { status: 409, message: "Workspace owner cannot be removed from the workspace" };
  }

  if (actorUserId === targetUserId) {
    throw { status: 409, message: "Use another workspace admin to remove this account" };
  }

  await db.query(
    `DELETE FROM project_users
     WHERE workspace_id = $1
       AND user_id = $2`,
    [workspaceId, targetUserId]
  );
  await db.query(
    `DELETE FROM user_project_access
     WHERE workspace_id = $1
       AND user_id = $2`,
    [workspaceId, targetUserId]
  );
  await db.query(
    `DELETE FROM agent_scope
     WHERE workspace_id = $1
       AND user_id = $2`,
    [workspaceId, targetUserId]
  );
  await db.query(
    `DELETE FROM user_permissions
     WHERE workspace_id = $1
       AND user_id = $2`,
    [workspaceId, targetUserId]
  );

  const deleted = await db.query(
    `DELETE FROM workspace_memberships
     WHERE workspace_id = $1
       AND user_id = $2
     RETURNING *`,
    [workspaceId, targetUserId]
  );

  await logAuditSafe({
    userId: actorUserId,
    workspaceId,
    action: "delete",
    entity: "workspace_member",
    entityId: targetUserId,
    oldData: membership,
    newData: {
      removed: Boolean(deleted.rows[0]),
    },
  });

  await syncWorkspaceSeatQuantity(workspaceId);
  await recordWorkspaceUsage({
    workspaceId,
    metricKey: "seat_changes",
    metadata: {
      action: "membership_removed",
      targetUserId,
    },
  });

  return deleted.rows[0] || membership;
}

export async function listWorkspaceMembersForUserService(
  workspaceId: string,
  userId: string
) {
  return listWorkspaceMembersService(workspaceId, userId);
}

export async function listWorkspaceSupportAccessService(workspaceId: string, userId: string) {
  assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  await assertWorkspaceMembershipOrPlatformOperator(userId, workspaceId);
  return listSupportAccessByWorkspace(workspaceId);
}

async function assertWorkspaceMembershipOrPlatformOperator(userId: string, workspaceId: string) {
  try {
    return await assertWorkspacePermission(userId, workspaceId, WORKSPACE_PERMISSIONS.manageWorkspace);
  } catch {
    await assertPlatformRoles(userId, ["super_admin", "developer"]);
    return null;
  }
}

export async function listWorkspaceSupportRequestsService(workspaceId: string, userId: string) {
  assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  await assertWorkspaceMembershipOrPlatformOperator(userId, workspaceId);
  return listSupportRequestsByWorkspace(workspaceId);
}

export async function createWorkspaceSupportRequestService(
  workspaceId: string,
  userId: string,
  payload: { targetUserId?: string; reason?: string; requestedExpiresAt?: string }
) {
  assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  await assertWorkspaceMembershipOrPlatformOperator(userId, workspaceId);

  const reason = String(payload.reason || "").trim();
  if (!reason) {
    throw { status: 400, message: "reason is required" };
  }

  const request = await createSupportRequest({
    workspaceId,
    requestedBy: userId,
    targetUserId: String(payload.targetUserId || "").trim() || null,
    reason,
    requestedExpiresAt: payload.requestedExpiresAt || null,
  });
  await logAuditSafe({
    userId,
    workspaceId,
    action: "create",
    entity: "support_request",
    entityId: request.id,
    newData: request,
  });
  return request;
}

export async function approveWorkspaceSupportRequestService(
  workspaceId: string,
  requestId: string,
  userId: string,
  payload: { expiresAt?: string; durationHours?: number; targetUserId?: string; resolutionNotes?: string }
) {
  assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  await assertPlatformRoles(userId, ["super_admin", "developer"]);

  const request = assertRecord(await findSupportRequestById(requestId), "Support request not found");
  if (request.workspace_id !== workspaceId) {
    throw { status: 400, message: "Support request does not belong to this workspace" };
  }
  if (request.status !== "open") {
    throw { status: 409, message: "Support request is no longer open" };
  }

  const targetUserId = String(payload.targetUserId || request.target_user_id || userId).trim();
  const durationHours = Math.max(1, Number(payload.durationHours || 24));
  const expiresAt =
    payload.expiresAt ||
    request.requested_expires_at ||
    new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

  const granted = await upsertSupportAccess({
    workspaceId,
    userId: targetUserId,
    grantedBy: userId,
    reason: request.reason,
    expiresAt,
  });
  const resolved = await updateSupportRequestStatus({
    id: requestId,
    status: "approved",
    resolvedBy: userId,
    resolutionNotes: payload.resolutionNotes || null,
  });
  await logAuditSafe({
    userId,
    workspaceId,
    action: "approve",
    entity: "support_request",
    entityId: requestId,
    oldData: request,
    newData: {
      supportRequest: resolved,
      supportAccess: granted,
    },
  });
  return {
    request: resolved,
    supportAccess: granted,
  };
}

export async function denyWorkspaceSupportRequestService(
  workspaceId: string,
  requestId: string,
  userId: string,
  payload: { resolutionNotes?: string } = {}
) {
  assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  await assertPlatformRoles(userId, ["super_admin", "developer"]);

  const request = assertRecord(await findSupportRequestById(requestId), "Support request not found");
  if (request.workspace_id !== workspaceId) {
    throw { status: 400, message: "Support request does not belong to this workspace" };
  }
  if (request.status !== "open") {
    throw { status: 409, message: "Support request is no longer open" };
  }

  const resolved = await updateSupportRequestStatus({
    id: requestId,
    status: "denied",
    resolvedBy: userId,
    resolutionNotes: payload.resolutionNotes || null,
  });
  await logAuditSafe({
    userId,
    workspaceId,
    action: "deny",
    entity: "support_request",
    entityId: requestId,
    oldData: request,
    newData: resolved || {},
  });
  return resolved;
}

export async function grantWorkspaceSupportAccessService(
  workspaceId: string,
  userId: string,
  payload: { userId?: string; expiresAt?: string; durationHours?: number; reason?: string }
) {
  assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  await assertPlatformRoles(userId, ["super_admin", "developer"]);

  const targetUserId = String(payload.userId || "").trim();
  if (!targetUserId) {
    throw { status: 400, message: "userId is required" };
  }

  const durationHours = Math.max(1, Number(payload.durationHours || 24));
  const expiresAt =
    payload.expiresAt ||
    new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

  const granted = await upsertSupportAccess({
    workspaceId,
    userId: targetUserId,
    grantedBy: userId,
    reason: payload.reason || "Workspace support access granted by owner/admin",
    expiresAt,
  });
  await logAuditSafe({
    userId,
    workspaceId,
    action: "grant_support_access",
    entity: "support_access",
    entityId: `${workspaceId}:${targetUserId}`,
    newData: granted,
  });
  return granted;
}

export async function revokeWorkspaceSupportAccessService(
  workspaceId: string,
  userId: string,
  targetUserId: string
) {
  assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  await assertPlatformRoles(userId, ["super_admin", "developer"]);
  const revoked = await deleteSupportAccess(workspaceId, targetUserId);
  await logAuditSafe({
    userId,
    workspaceId,
    action: "revoke_support_access",
    entity: "support_access",
    entityId: `${workspaceId}:${targetUserId}`,
    oldData: revoked || {},
  });
  return revoked;
}

export async function deleteWorkspaceService(workspaceId: string, userId: string) {
  assertRecord(await findWorkspaceById(workspaceId, userId), "Workspace not found");
  await assertPlatformRoles(userId, ["super_admin", "developer"]);

  const dependencyRes = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM bots WHERE workspace_id = $1) AS bot_count,
       (SELECT COUNT(*)::int FROM flows f JOIN bots b ON b.id = f.bot_id WHERE b.workspace_id = $1) AS flow_count,
       (SELECT COUNT(*)::int FROM campaigns WHERE workspace_id = $1) AS campaign_count,
       (SELECT COUNT(*)::int FROM platform_accounts WHERE workspace_id = $1) AS platform_account_count,
       (SELECT COUNT(*)::int FROM conversations WHERE workspace_id = $1) AS conversation_count`,
    [workspaceId]
  );

  const dependency = dependencyRes.rows[0];
  const blockingCount = Number(dependency?.bot_count || 0)
    + Number(dependency?.flow_count || 0)
    + Number(dependency?.campaign_count || 0)
    + Number(dependency?.platform_account_count || 0)
    + Number(dependency?.conversation_count || 0);

  if (blockingCount > 0) {
    throw {
      status: 409,
      message:
        "Workspace cannot be deleted while bots, flows, campaigns, integrations, or conversations still exist.",
    };
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM project_users WHERE workspace_id = $1`, [workspaceId]);
    await client.query(`DELETE FROM user_project_access WHERE workspace_id = $1`, [workspaceId]);
    await client.query(
      `DELETE FROM project_settings
       WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = $1)`,
      [workspaceId]
    );
    await client.query(`DELETE FROM projects WHERE workspace_id = $1`, [workspaceId]);
    await client.query(`DELETE FROM workspace_memberships WHERE workspace_id = $1`, [workspaceId]);
    await client.query(`DELETE FROM billing_subscriptions WHERE workspace_id = $1`, [workspaceId]);
    const deleted = await client.query(
      `DELETE FROM workspaces
       WHERE id = $1
       RETURNING *`,
      [workspaceId]
    );
    await client.query("COMMIT");
    await logAuditSafe({
      userId,
      workspaceId,
      action: "delete",
      entity: "workspace",
      entityId: workspaceId,
      oldData: deleted.rows[0] || {},
    });
    return deleted.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
