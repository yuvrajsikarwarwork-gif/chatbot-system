import { query } from "../config/db";

export interface WalletTransactionInput {
  workspaceId: string;
  projectId?: string | null;
  billingSubscriptionId?: string | null;
  conversationId?: string | null;
  botId?: string | null;
  platform?: string | null;
  transactionType: "credit" | "debit" | "adjustment" | "hold" | "release" | "refund";
  entryKind?: string | null;
  pricingCategory?: string | null;
  unitType?: string | null;
  unitCount?: number;
  unitPrice?: number | null;
  amount: number;
  currency?: string | null;
  balanceAfter?: number | null;
  externalRef?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
}

export async function createWalletTransaction(input: WalletTransactionInput) {
  const res = await query(
    `INSERT INTO wallet_transactions (
       workspace_id,
       project_id,
       billing_subscription_id,
       conversation_id,
       bot_id,
       platform,
       transaction_type,
       entry_kind,
       pricing_category,
       unit_type,
       unit_count,
       unit_price,
       amount,
       currency,
       balance_after,
       external_ref,
       reference_type,
       reference_id,
       metadata,
       created_by
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20
     )
     RETURNING *`,
    [
      input.workspaceId,
      input.projectId || null,
      input.billingSubscriptionId || null,
      input.conversationId || null,
      input.botId || null,
      input.platform || "wallet",
      input.transactionType,
      input.entryKind || "wallet",
      input.pricingCategory || null,
      input.unitType || null,
      Number(input.unitCount || 1),
      input.unitPrice ?? null,
      Number(input.amount || 0),
      input.currency || "INR",
      input.balanceAfter ?? null,
      input.externalRef || null,
      input.referenceType || null,
      input.referenceId || null,
      JSON.stringify(input.metadata || {}),
      input.createdBy || null,
    ]
  );

  return res.rows[0];
}

export async function listWalletTransactionsByWorkspace(workspaceId: string, limit = 20) {
  const res = await query(
    `SELECT *
     FROM wallet_transactions
     WHERE workspace_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [workspaceId, Math.max(1, Math.min(limit, 100))]
  );

  return res.rows;
}

export async function getWalletLedgerSummary(workspaceId: string) {
  const res = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0)::numeric AS total_credits,
       COALESCE(SUM(CASE WHEN transaction_type IN ('debit', 'hold') THEN amount ELSE 0 END), 0)::numeric AS total_debits,
       COALESCE(SUM(
         CASE
           WHEN transaction_type IN ('credit', 'refund', 'release') THEN amount
           WHEN transaction_type IN ('debit', 'hold') THEN -amount
           ELSE amount
         END
       ), 0)::numeric AS balance
     FROM wallet_transactions
     WHERE workspace_id = $1`,
    [workspaceId]
  );

  return res.rows[0] || null;
}
