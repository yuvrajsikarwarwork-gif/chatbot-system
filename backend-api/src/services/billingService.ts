import { query } from "../config/db";
import {
  createBillingSubscription,
  findCurrentBillingSubscriptionByWorkspace,
  updateBillingSubscription,
} from "../models/billingSubscriptionModel";
import { findPlanById } from "../models/planModel";
import { incrementUsageCounter, listUsageCountersByWorkspace } from "../models/usageCounterModel";

const DEFAULT_MAX_CAMPAIGNS = Number(process.env.MAX_CAMPAIGNS_PER_USER || 25);
const DEFAULT_MAX_PLATFORM_ACCOUNTS = Number(process.env.MAX_PLATFORM_ACCOUNTS_PER_USER || 50);
const DEFAULT_MAX_USERS = Number(process.env.MAX_USERS_PER_WORKSPACE || 25);
const DEFAULT_MAX_PROJECTS = Number(process.env.MAX_PROJECTS_PER_WORKSPACE || 10);
const DEFAULT_MAX_BOTS = Number(process.env.MAX_BOTS_PER_WORKSPACE || 25);

type EffectiveBilling = {
  workspaceId: string;
  workspace: any | null;
  plan: any | null;
  subscription: any | null;
};

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizePricingMap(input: unknown) {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : {};
}

export function getCurrentPeriodKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

export async function getEffectiveWorkspaceBilling(workspaceId: string): Promise<EffectiveBilling> {
  const workspaceRes = await query(
    `SELECT *
     FROM workspaces
     WHERE id = $1
     LIMIT 1`,
    [workspaceId]
  );
  const subscription = await findCurrentBillingSubscriptionByWorkspace(workspaceId);

  return {
    workspaceId,
    workspace: workspaceRes.rows[0] || null,
    plan: subscription?.plan_id ? await findPlanById(String(subscription.plan_id)) : null,
    subscription: subscription || null,
  };
}

const WORKSPACE_LIMIT_OVERRIDE_MAP: Record<string, string[]> = {
  agent_seat_limit: ["agent_seat_limit_override"],
  project_limit: ["project_limit_override"],
  active_bot_limit: ["active_bot_limit_override"],
  monthly_campaign_limit: ["monthly_campaign_limit_override"],
  max_numbers: ["max_numbers_override"],
  ai_reply_limit: ["ai_reply_limit_override"],
  max_users: ["agent_seat_limit_override"],
  max_projects: ["project_limit_override"],
  max_bots: ["active_bot_limit_override"],
  max_campaigns: ["monthly_campaign_limit_override"],
  max_integrations: ["max_numbers_override"],
};

export function resolvePlanLimit(plan: any, subscription: any, key: string, fallback: number | null = null) {
  const candidates = [
    subscription?.[key],
    plan?.[key],
  ];

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") {
      continue;
    }
    const next = Number(candidate);
    if (Number.isFinite(next) && next > 0) {
      return next;
    }
  }

  return fallback;
}

export function resolveWorkspacePlanLimit(
  workspace: any,
  plan: any,
  subscription: any,
  key: string,
  fallback: number | null = null
) {
  for (const overrideKey of WORKSPACE_LIMIT_OVERRIDE_MAP[key] || []) {
    const candidate = workspace?.[overrideKey];
    if (candidate === null || candidate === undefined || candidate === "") {
      continue;
    }
    const next = Number(candidate);
    if (Number.isFinite(next) && next > 0) {
      return next;
    }
  }

  return resolvePlanLimit(plan, subscription, key, fallback);
}

export async function recordWorkspaceUsage(input: {
  workspaceId: string;
  projectId?: string | null;
  metricKey: string;
  quantity?: number;
  metadata?: Record<string, unknown> | null;
}) {
  return incrementUsageCounter({
    workspaceId: input.workspaceId,
    projectId: input.projectId || null,
    metricKey: input.metricKey,
    periodKey: getCurrentPeriodKey(),
    quantity: input.quantity ?? 1,
    metadata: input.metadata || {},
  });
}

export async function getWorkspaceUsageQuantity(input: {
  workspaceId: string;
  metricKey: string;
  projectId?: string | null;
  periodKey?: string;
}) {
  const rows = await listUsageCountersByWorkspace({
    workspaceId: input.workspaceId,
    periodKey: input.periodKey || getCurrentPeriodKey(),
  });

  return rows
    .filter((row: any) =>
      String(row.metric_key || "") === input.metricKey &&
      String(row.project_id || "") === String(input.projectId || "")
    )
    .reduce((sum: number, row: any) => sum + toNumber(row.quantity), 0);
}

export async function syncWorkspaceSeatQuantity(workspaceId: string) {
  const res = await query(
    `SELECT COUNT(*)::int AS total
     FROM workspace_memberships
     WHERE workspace_id = $1
       AND status IN ('active', 'invited')`,
    [workspaceId]
  );

  const seatQuantity = Number(res.rows[0]?.total || 0);
  const current = await findCurrentBillingSubscriptionByWorkspace(workspaceId);

  if (current) {
    const plan = await findPlanById(String(current.plan_id || ""));
    const effectiveBilling = await getEffectiveWorkspaceBilling(workspaceId);
    const includedSeatLimit =
      current.included_seat_limit ??
      resolveWorkspacePlanLimit(
        effectiveBilling.workspace,
        plan,
        current,
        "agent_seat_limit",
        null
      );
    const extraSeatQuantity =
      includedSeatLimit && includedSeatLimit > 0 ? Math.max(0, seatQuantity - includedSeatLimit) : 0;

    return updateBillingSubscription(current.id, {
      seatQuantity,
      includedSeatLimit,
      extraSeatQuantity,
    });
  }

  const workspaceRes = await query(`SELECT plan_id FROM workspaces WHERE id = $1 LIMIT 1`, [workspaceId]);
  const planId = String(workspaceRes.rows[0]?.plan_id || "starter");
  const plan = await findPlanById(planId);
  if (!plan) {
    return null;
  }

  const includedSeatLimit =
    resolveWorkspacePlanLimit(
      (await getEffectiveWorkspaceBilling(workspaceId)).workspace,
      plan,
      null,
      "agent_seat_limit",
      null
    ) ??
    toNumber(plan.included_users || plan.max_users || 0, 0);

  return createBillingSubscription({
    workspaceId,
    planId,
    status: "active",
    billingCycle: "monthly",
    currency: "INR",
    basePriceAmount: toNumber(plan.monthly_price_inr),
    seatQuantity,
    includedSeatLimit,
    extraSeatQuantity:
      includedSeatLimit && includedSeatLimit > 0 ? Math.max(0, seatQuantity - includedSeatLimit) : 0,
    extraSeatUnitPrice: toNumber(plan.extra_agent_seat_price_inr),
    aiReplyLimit: resolvePlanLimit(plan, null, "ai_reply_limit", null),
    aiOverageUnitPrice: 0,
    metadata: {
      created_by: "seat_sync",
    },
  });
}

export function resolveWalletUnitPrice(input: {
  plan: any;
  subscription: any;
  platform?: string | null;
  pricingCategory?: string | null;
}) {
  const pricing = normalizePricingMap(input.plan?.wallet_pricing);
  const platform = String(input.platform || "wallet").trim().toLowerCase();
  const category = String(input.pricingCategory || "").trim().toLowerCase();

  const categoryConfig =
    (category && pricing[category] && typeof pricing[category] === "object"
      ? (pricing[category] as Record<string, unknown>)
      : null) ||
    (pricing[platform] && typeof pricing[platform] === "object"
      ? (pricing[platform] as Record<string, unknown>)
      : null);

  const unitPrice =
    toNumber(categoryConfig?.amount, NaN) ||
    toNumber(categoryConfig?.unit_price, NaN) ||
    (platform === "whatsapp" ? 1.05 : 0);

  return Number.isFinite(unitPrice) ? unitPrice : 0;
}

export async function ensureCampaignRunWithinLimit(workspaceId: string) {
  const { workspace, plan, subscription } = await getEffectiveWorkspaceBilling(workspaceId);
  const limit = resolveWorkspacePlanLimit(
    workspace,
    plan,
    subscription,
    "monthly_campaign_limit",
    DEFAULT_MAX_CAMPAIGNS
  );
  if (!limit) {
    return;
  }

  const total = await getWorkspaceUsageQuantity({
    workspaceId,
    metricKey: "campaign_runs",
  });

  if (total >= limit) {
    throw {
      status: 403,
      message: `Campaign run limit reached for this billing period (${limit}).`,
    };
  }
}

export async function ensureAiReplyWithinLimit(workspaceId: string) {
  const { workspace, plan, subscription } = await getEffectiveWorkspaceBilling(workspaceId);
  const limit = resolveWorkspacePlanLimit(
    workspace,
    plan,
    subscription,
    "ai_reply_limit",
    null
  );
  if (!limit) {
    return { overage: false, limit: null, total: 0, overageUnitPrice: 0 };
  }

  const total = await getWorkspaceUsageQuantity({
    workspaceId,
    metricKey: "ai_replies",
  });

  return {
    overage: total >= limit,
    limit,
    total,
    overageUnitPrice: toNumber(subscription?.ai_overage_unit_price, 0),
  };
}
