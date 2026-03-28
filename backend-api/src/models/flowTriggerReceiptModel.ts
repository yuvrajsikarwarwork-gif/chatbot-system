import crypto from "crypto";

import { query } from "../config/db";

export type FlowTriggerReceiptRecord = {
  id: string;
  idempotency_key: string;
  request_fingerprint: string;
  status: "processing" | "completed" | "failed";
  bot_id?: string | null;
  flow_id?: string | null;
  conversation_id?: string | null;
  contact_id?: string | null;
  request_payload?: Record<string, unknown>;
  response_payload?: Record<string, unknown> | null;
  error_message?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function buildFlowTriggerFingerprint(payload: Record<string, unknown>) {
  const normalized = JSON.stringify(payload || {});
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export async function createFlowTriggerReceipt(input: {
  idempotencyKey: string;
  requestFingerprint: string;
  requestPayload: Record<string, unknown>;
  botId?: string | null;
  flowId?: string | null;
  conversationId?: string | null;
  contactId?: string | null;
}) {
  const res = await query(
    `INSERT INTO flow_trigger_receipts
     (idempotency_key, request_fingerprint, status, bot_id, flow_id, conversation_id, contact_id, request_payload)
     VALUES ($1, $2, 'processing', $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING *`,
    [
      input.idempotencyKey,
      input.requestFingerprint,
      input.botId || null,
      input.flowId || null,
      input.conversationId || null,
      input.contactId || null,
      JSON.stringify(input.requestPayload || {}),
    ]
  );

  return (res.rows[0] || null) as FlowTriggerReceiptRecord | null;
}

export async function findFlowTriggerReceiptByIdempotencyKey(idempotencyKey: string) {
  const res = await query(
    `SELECT *
     FROM flow_trigger_receipts
     WHERE idempotency_key = $1
     LIMIT 1`,
    [idempotencyKey]
  );

  return (res.rows[0] || null) as FlowTriggerReceiptRecord | null;
}

export async function findRecentFlowTriggerReceiptByFingerprint(
  requestFingerprint: string,
  withinMinutes = 10
) {
  const res = await query(
    `SELECT *
     FROM flow_trigger_receipts
     WHERE request_fingerprint = $1
       AND created_at >= NOW() - ($2::text || ' minutes')::interval
     ORDER BY created_at DESC
     LIMIT 1`,
    [requestFingerprint, String(withinMinutes)]
  );

  return (res.rows[0] || null) as FlowTriggerReceiptRecord | null;
}

export async function completeFlowTriggerReceipt(input: {
  id: string;
  responsePayload: Record<string, unknown>;
  botId?: string | null;
  flowId?: string | null;
  conversationId?: string | null;
  contactId?: string | null;
}) {
  const res = await query(
    `UPDATE flow_trigger_receipts
     SET status = 'completed',
         response_payload = $2::jsonb,
         bot_id = COALESCE($3, bot_id),
         flow_id = COALESCE($4, flow_id),
         conversation_id = COALESCE($5, conversation_id),
         contact_id = COALESCE($6, contact_id),
         error_message = NULL,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      input.id,
      JSON.stringify(input.responsePayload || {}),
      input.botId || null,
      input.flowId || null,
      input.conversationId || null,
      input.contactId || null,
    ]
  );

  return (res.rows[0] || null) as FlowTriggerReceiptRecord | null;
}

export async function failFlowTriggerReceipt(input: {
  id: string;
  errorMessage: string;
  botId?: string | null;
  flowId?: string | null;
  conversationId?: string | null;
  contactId?: string | null;
}) {
  const res = await query(
    `UPDATE flow_trigger_receipts
     SET status = 'failed',
         error_message = $2,
         bot_id = COALESCE($3, bot_id),
         flow_id = COALESCE($4, flow_id),
         conversation_id = COALESCE($5, conversation_id),
         contact_id = COALESCE($6, contact_id),
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      input.id,
      input.errorMessage,
      input.botId || null,
      input.flowId || null,
      input.conversationId || null,
      input.contactId || null,
    ]
  );

  return (res.rows[0] || null) as FlowTriggerReceiptRecord | null;
}
