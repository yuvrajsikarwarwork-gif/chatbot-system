import { query } from "../config/db";
import {
  getWalletLedgerSummary,
  listWalletTransactionsByWorkspace,
  createWalletTransaction,
} from "../models/walletTransactionModel";
import {
  ensureAiReplyWithinLimit,
  getEffectiveWorkspaceBilling,
  recordWorkspaceUsage,
  resolveWalletUnitPrice,
} from "./billingService";

let walletSupport:
  | {
      transactionTable: boolean;
    }
  | null = null;

async function getWalletSupport() {
  if (walletSupport) {
    return walletSupport;
  }

  const res = await query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('wallet_transactions')`
  );

  const tables = new Set(res.rows.map((row: any) => String(row.table_name || "").trim()));
  walletSupport = {
    transactionTable: tables.has("wallet_transactions"),
  };
  return walletSupport;
}

function normalizeEntryKind(value?: string | null) {
  const normalized = String(value || "wallet").trim().toLowerCase();
  return normalized || "wallet";
}

export async function getWorkspaceWalletSummary(input: {
  workspaceId: string;
  limit?: number;
}) {
  const support = await getWalletSupport();
  if (!support.transactionTable) {
    return {
      enabled: false,
      balance: 0,
      totalCredits: 0,
      totalDebits: 0,
      recentTransactions: [],
    };
  }

  const summary = await getWalletLedgerSummary(input.workspaceId);
  const transactions = await listWalletTransactionsByWorkspace(
    input.workspaceId,
    input.limit || 20
  );

  return {
    enabled: true,
    balance: Number(summary?.balance || 0),
    totalCredits: Number(summary?.total_credits || 0),
    totalDebits: Number(summary?.total_debits || 0),
    recentTransactions: transactions,
  };
}

export async function createWalletAdjustment(input: {
  workspaceId: string;
  projectId?: string | null;
  actorUserId: string;
  transactionType: "credit" | "debit" | "adjustment";
  amount: number;
  note?: string | null;
  externalRef?: string | null;
}) {
  const support = await getWalletSupport();
  if (!support.transactionTable) {
    throw {
      status: 409,
      message: "Wallet tracking is not enabled yet. Apply the billing foundation migration first.",
    };
  }

  const workspaceId = String(input.workspaceId || "").trim();
  const amount = Number(input.amount);
  if (!workspaceId) {
    throw { status: 400, message: "workspaceId is required" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw { status: 400, message: "Wallet amount must be greater than zero." };
  }

  const ledger = await getWorkspaceWalletSummary({ workspaceId, limit: 1 });
  const balanceAfter =
    input.transactionType === "debit"
      ? Number(ledger.balance || 0) - amount
      : Number(ledger.balance || 0) + amount;

  return createWalletTransaction({
    workspaceId,
    projectId: input.projectId || null,
    transactionType: input.transactionType,
    amount,
    balanceAfter,
    entryKind: "wallet",
    pricingCategory: "manual_adjustment",
    referenceType: "workspace",
    referenceId: workspaceId,
    metadata: {
      source: "admin_adjustment",
      note: String(input.note || "").trim() || null,
    },
    externalRef: input.externalRef || null,
    createdBy: input.actorUserId,
  });
}

export async function assertWalletCanCharge(input: {
  workspaceId?: string | null;
  platform?: string | null;
  amount?: number;
}) {
  const support = await getWalletSupport();
  if (!support.transactionTable) {
    return;
  }

  const workspaceId = String(input.workspaceId || "").trim();
  if (!workspaceId) {
    return;
  }

  const summary = await getWorkspaceWalletSummary({ workspaceId, limit: 1 });
  const amount = Number.isFinite(input.amount) ? Number(input.amount) : 0;
  if (amount > 0 && Number(summary.balance || 0) < amount) {
    throw {
      status: 402,
      message: "Wallet balance is too low for this usage.",
    };
  }
}

export async function recordOutboundMessageCharge(input: {
  workspaceId?: string | null;
  projectId?: string | null;
  conversationId?: string | null;
  botId?: string | null;
  platform?: string | null;
  externalMessageId?: string | null;
  amount?: number;
  pricingCategory?: string | null;
  entryKind?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const support = await getWalletSupport();
  if (!support.transactionTable) {
    return null;
  }

  const workspaceId = String(input.workspaceId || "").trim();
  if (!workspaceId) {
    return null;
  }

  const billing = await getEffectiveWorkspaceBilling(workspaceId);
  const pricingCategory = String(input.pricingCategory || "").trim().toLowerCase() || null;
  const amount =
    Number.isFinite(input.amount) && Number(input.amount) > 0
      ? Number(input.amount)
      : resolveWalletUnitPrice({
          plan: billing.plan,
          subscription: billing.subscription,
          platform: input.platform || null,
          pricingCategory,
        });

  await recordWorkspaceUsage({
    workspaceId,
    projectId: input.projectId || null,
    metricKey: "outbound_messages",
    metadata: {
      platform: input.platform || null,
      pricingCategory,
      entryKind: normalizeEntryKind(input.entryKind),
    },
  });

  if (!amount || amount <= 0) {
    return null;
  }

  await assertWalletCanCharge({
    workspaceId,
    platform: input.platform || null,
    amount,
  });

  const ledger = await getWorkspaceWalletSummary({ workspaceId, limit: 1 });
  const balanceAfter = Number(ledger.balance || 0) - amount;

  return createWalletTransaction({
    workspaceId,
    projectId: input.projectId || null,
    billingSubscriptionId: billing.subscription?.id || null,
    conversationId: input.conversationId || null,
    botId: input.botId || null,
    platform: input.platform || "wallet",
    transactionType: "debit",
    entryKind: normalizeEntryKind(input.entryKind),
    pricingCategory,
    unitType: "message",
    unitCount: 1,
    unitPrice: amount,
    amount,
    balanceAfter,
    externalRef: input.externalMessageId || null,
    referenceType: input.referenceType || "conversation",
    referenceId: input.referenceId || input.conversationId || null,
    metadata: input.metadata || {},
  });
}

export async function recordAiReplyUsage(input: {
  workspaceId?: string | null;
  projectId?: string | null;
  conversationId?: string | null;
  botId?: string | null;
  platform?: string | null;
  referenceId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const workspaceId = String(input.workspaceId || "").trim();
  if (!workspaceId) {
    return null;
  }

  await recordWorkspaceUsage({
    workspaceId,
    projectId: input.projectId || null,
    metricKey: "ai_replies",
    metadata: input.metadata || {},
  });

  const aiUsage = await ensureAiReplyWithinLimit(workspaceId);
  if (!aiUsage.overage || !aiUsage.overageUnitPrice || aiUsage.overageUnitPrice <= 0) {
    return null;
  }

  await assertWalletCanCharge({
    workspaceId,
    platform: input.platform || null,
    amount: aiUsage.overageUnitPrice,
  });

  const ledger = await getWorkspaceWalletSummary({ workspaceId, limit: 1 });
  const balanceAfter = Number(ledger.balance || 0) - Number(aiUsage.overageUnitPrice);
  const billing = await getEffectiveWorkspaceBilling(workspaceId);

  return createWalletTransaction({
    workspaceId,
    projectId: input.projectId || null,
    billingSubscriptionId: billing.subscription?.id || null,
    conversationId: input.conversationId || null,
    botId: input.botId || null,
    platform: input.platform || "wallet",
    transactionType: "debit",
    entryKind: "ai_overage",
    pricingCategory: "ai_reply_overage",
    unitType: "reply",
    unitCount: 1,
    unitPrice: Number(aiUsage.overageUnitPrice),
    amount: Number(aiUsage.overageUnitPrice),
    balanceAfter,
    referenceType: "conversation",
    referenceId: input.referenceId || input.conversationId || null,
    metadata: {
      ...(input.metadata || {}),
      aiReplyLimit: aiUsage.limit,
      priorUsage: aiUsage.total,
    },
  });
}
