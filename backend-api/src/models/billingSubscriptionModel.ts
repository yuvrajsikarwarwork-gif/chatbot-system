import { query } from "../config/db";

export interface BillingSubscriptionInput {
  workspaceId: string;
  planId: string;
  status?: string;
  billingCycle?: string;
  currency?: string;
  basePriceAmount?: number;
  seatQuantity?: number;
  includedSeatLimit?: number | null;
  extraSeatQuantity?: number;
  extraSeatUnitPrice?: number;
  aiReplyLimit?: number | null;
  aiOverageUnitPrice?: number;
  walletAutoTopupEnabled?: boolean;
  walletAutoTopupAmount?: number | null;
  walletLowBalanceThreshold?: number | null;
  externalCustomerRef?: string | null;
  externalSubscriptionRef?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  canceledAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface BillingSubscriptionUpdateInput extends Partial<BillingSubscriptionInput> {}

export async function findCurrentBillingSubscriptionByWorkspace(workspaceId: string) {
  const res = await query(
    `SELECT bs.*, p.name AS plan_name, p.wallet_pricing, p.support_tier
     FROM billing_subscriptions bs
     JOIN plans p ON p.id = bs.plan_id
     WHERE bs.workspace_id = $1
     ORDER BY bs.created_at DESC
     LIMIT 1`,
    [workspaceId]
  );

  return res.rows[0] || null;
}

export async function createBillingSubscription(input: BillingSubscriptionInput) {
  const res = await query(
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
       wallet_auto_topup_enabled,
       wallet_auto_topup_amount,
       wallet_low_balance_threshold,
       external_customer_ref,
       external_subscription_ref,
       current_period_start,
       current_period_end,
       trial_ends_at,
       canceled_at,
       metadata
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22::jsonb
     )
     RETURNING *`,
    [
      input.workspaceId,
      input.planId,
      input.status || "active",
      input.billingCycle || "monthly",
      input.currency || "INR",
      Number(input.basePriceAmount || 0),
      Number(input.seatQuantity || 0),
      input.includedSeatLimit ?? null,
      Number(input.extraSeatQuantity || 0),
      Number(input.extraSeatUnitPrice || 0),
      input.aiReplyLimit ?? null,
      Number(input.aiOverageUnitPrice || 0),
      input.walletAutoTopupEnabled === true,
      input.walletAutoTopupAmount ?? null,
      input.walletLowBalanceThreshold ?? null,
      input.externalCustomerRef || null,
      input.externalSubscriptionRef || null,
      input.currentPeriodStart || null,
      input.currentPeriodEnd || null,
      input.trialEndsAt || null,
      input.canceledAt || null,
      JSON.stringify(input.metadata || {}),
    ]
  );

  return res.rows[0];
}

export async function updateBillingSubscription(id: string, input: BillingSubscriptionUpdateInput) {
  const res = await query(
    `UPDATE billing_subscriptions
     SET
       plan_id = COALESCE($2, plan_id),
       status = COALESCE($3, status),
       billing_cycle = COALESCE($4, billing_cycle),
       currency = COALESCE($5, currency),
       base_price_amount = COALESCE($6, base_price_amount),
       seat_quantity = COALESCE($7, seat_quantity),
       included_seat_limit = COALESCE($8, included_seat_limit),
       extra_seat_quantity = COALESCE($9, extra_seat_quantity),
       extra_seat_unit_price = COALESCE($10, extra_seat_unit_price),
       ai_reply_limit = COALESCE($11, ai_reply_limit),
       ai_overage_unit_price = COALESCE($12, ai_overage_unit_price),
       wallet_auto_topup_enabled = COALESCE($13, wallet_auto_topup_enabled),
       wallet_auto_topup_amount = COALESCE($14, wallet_auto_topup_amount),
       wallet_low_balance_threshold = COALESCE($15, wallet_low_balance_threshold),
       external_customer_ref = COALESCE($16, external_customer_ref),
       external_subscription_ref = COALESCE($17, external_subscription_ref),
       current_period_start = COALESCE($18, current_period_start),
       current_period_end = COALESCE($19, current_period_end),
       trial_ends_at = COALESCE($20, trial_ends_at),
       canceled_at = COALESCE($21, canceled_at),
       metadata = CASE WHEN $22::jsonb IS NULL THEN metadata ELSE $22::jsonb END,
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.planId || null,
      input.status || null,
      input.billingCycle || null,
      input.currency || null,
      input.basePriceAmount ?? null,
      input.seatQuantity ?? null,
      input.includedSeatLimit ?? null,
      input.extraSeatQuantity ?? null,
      input.extraSeatUnitPrice ?? null,
      input.aiReplyLimit ?? null,
      input.aiOverageUnitPrice ?? null,
      typeof input.walletAutoTopupEnabled === "boolean" ? input.walletAutoTopupEnabled : null,
      input.walletAutoTopupAmount ?? null,
      input.walletLowBalanceThreshold ?? null,
      input.externalCustomerRef || null,
      input.externalSubscriptionRef || null,
      input.currentPeriodStart || null,
      input.currentPeriodEnd || null,
      input.trialEndsAt || null,
      input.canceledAt || null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );

  return res.rows[0] || null;
}
