import { query } from "../config/db";

interface SubscriptionUpdateInput {
  status?: string | null;
  billingCycle?: string | null;
  currency?: string | null;
  priceAmount?: number | null;
  expiryDate?: string | null;
  gracePeriodEnd?: string | null;
  autoRenew?: boolean | null;
  reminderLastSentAt?: string | null;
  lockAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function updateLatestWorkspaceSubscription(
  workspaceId: string,
  input: SubscriptionUpdateInput
) {
  const res = await query(
    `UPDATE billing_subscriptions s
     SET
       status = COALESCE($1, s.status),
       billing_cycle = COALESCE($2, s.billing_cycle),
       currency = COALESCE($3, s.currency),
       base_price_amount = COALESCE($4, s.base_price_amount),
       current_period_end = COALESCE($5, s.current_period_end),
       canceled_at = CASE
         WHEN $6::timestamptz IS NULL THEN s.canceled_at
         ELSE $6::timestamptz
       END,
       metadata = CASE
         WHEN $10::jsonb IS NULL THEN s.metadata
         ELSE s.metadata || $10::jsonb
       END,
       updated_at = NOW()
     WHERE s.id = (
       SELECT id
       FROM billing_subscriptions
       WHERE workspace_id = $11
       ORDER BY created_at DESC
       LIMIT 1
     )
     RETURNING *`,
    [
      input.status || null,
      input.billingCycle || null,
      input.currency || null,
      input.priceAmount ?? null,
      input.expiryDate || null,
      input.gracePeriodEnd || input.lockAt || null,
      null,
      null,
      null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      workspaceId,
    ]
  );

  return res.rows[0];
}
