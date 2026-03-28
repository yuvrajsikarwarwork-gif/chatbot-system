import { query } from "../config/db";

export async function findPlans() {
  const res = await query(
    `SELECT *
     FROM plans
     ORDER BY
       CASE WHEN status = 'active' THEN 0 ELSE 1 END,
       monthly_price_inr ASC,
       name ASC`
  );

  return res.rows;
}

export async function findPlanById(id: string) {
  const res = await query(
    `SELECT *
     FROM plans
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return res.rows[0];
}

export async function findActiveSubscriptionByWorkspace(workspaceId: string) {
  const res = await query(
    `SELECT
       bs.*,
       p.name AS plan_name,
       p.max_campaigns,
       p.max_numbers,
       p.allowed_platforms,
       p.features,
       bs.current_period_end AS expiry_date,
       NULL::timestamptz AS grace_period_end,
       bs.base_price_amount AS price_amount
     FROM billing_subscriptions bs
     JOIN plans p ON p.id = bs.plan_id
     WHERE bs.workspace_id = $1
       AND bs.status IN ('active', 'trialing', 'overdue')
     ORDER BY bs.created_at DESC
     LIMIT 1`,
    [workspaceId]
  );

  return res.rows[0] || null;
}

export async function findLatestSubscriptionByWorkspace(workspaceId: string) {
  const res = await query(
    `SELECT
       bs.*,
       p.name AS plan_name,
       p.max_campaigns,
       p.max_numbers,
       p.allowed_platforms,
       p.features,
       bs.current_period_end AS expiry_date,
       NULL::timestamptz AS grace_period_end,
       bs.base_price_amount AS price_amount
     FROM billing_subscriptions bs
     JOIN plans p ON p.id = bs.plan_id
     WHERE bs.workspace_id = $1
     ORDER BY bs.created_at DESC
     LIMIT 1`,
    [workspaceId]
  );

  return res.rows[0] || null;
}

export async function createPlan(input: Record<string, unknown>) {
  const res = await query(
    `INSERT INTO plans (
       id,
       name,
       description,
       monthly_price_inr,
       yearly_price_inr,
       monthly_price_usd,
       yearly_price_usd,
       max_campaigns,
       max_numbers,
       max_users,
       max_projects,
       max_integrations,
       max_bots,
       included_users,
       workspace_limit,
       project_limit,
       agent_seat_limit,
       active_bot_limit,
       monthly_campaign_limit,
       ai_reply_limit,
       extra_agent_seat_price_inr,
       pricing_model,
       support_tier,
       wallet_pricing,
       allowed_platforms,
       features,
       status
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24::jsonb, $25::jsonb, $26::jsonb, $27
     )
     RETURNING *`,
    [
      input.id,
      input.name,
      input.description || null,
      Number(input.monthly_price_inr || 0),
      Number(input.yearly_price_inr || 0),
      Number(input.monthly_price_usd || 0),
      Number(input.yearly_price_usd || 0),
      Number(input.max_campaigns || 0),
      Number(input.max_numbers || 0),
      Number(input.max_users || 0),
      Number(input.max_projects || 0),
      Number(input.max_integrations || 0),
      Number(input.max_bots || 0),
      Number(input.included_users || 0),
      input.workspace_limit ?? null,
      input.project_limit ?? null,
      input.agent_seat_limit ?? null,
      input.active_bot_limit ?? null,
      input.monthly_campaign_limit ?? null,
      input.ai_reply_limit ?? null,
      input.extra_agent_seat_price_inr ?? null,
      input.pricing_model || "standard",
      input.support_tier || null,
      JSON.stringify(input.wallet_pricing || {}),
      JSON.stringify(input.allowed_platforms || []),
      JSON.stringify(input.features || {}),
      input.status || "active",
    ]
  );

  return res.rows[0];
}

export async function updatePlan(id: string, input: Record<string, unknown>) {
  const res = await query(
    `UPDATE plans
     SET
       name = COALESCE($2, name),
       description = CASE WHEN $3::text IS NULL THEN description ELSE $3 END,
       monthly_price_inr = COALESCE($4, monthly_price_inr),
       yearly_price_inr = COALESCE($5, yearly_price_inr),
       monthly_price_usd = COALESCE($6, monthly_price_usd),
       yearly_price_usd = COALESCE($7, yearly_price_usd),
       max_campaigns = COALESCE($8, max_campaigns),
       max_numbers = COALESCE($9, max_numbers),
       max_users = COALESCE($10, max_users),
       max_projects = COALESCE($11, max_projects),
       max_integrations = COALESCE($12, max_integrations),
       max_bots = COALESCE($13, max_bots),
       included_users = COALESCE($14, included_users),
       workspace_limit = COALESCE($15, workspace_limit),
       project_limit = COALESCE($16, project_limit),
       agent_seat_limit = COALESCE($17, agent_seat_limit),
       active_bot_limit = COALESCE($18, active_bot_limit),
       monthly_campaign_limit = COALESCE($19, monthly_campaign_limit),
       ai_reply_limit = COALESCE($20, ai_reply_limit),
       extra_agent_seat_price_inr = COALESCE($21, extra_agent_seat_price_inr),
       pricing_model = COALESCE($22, pricing_model),
       support_tier = COALESCE($23, support_tier),
       wallet_pricing = CASE WHEN $24::jsonb IS NULL THEN wallet_pricing ELSE $24::jsonb END,
       allowed_platforms = CASE WHEN $25::jsonb IS NULL THEN allowed_platforms ELSE $25::jsonb END,
       features = CASE WHEN $26::jsonb IS NULL THEN features ELSE $26::jsonb END,
       status = COALESCE($27, status),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.name || null,
      input.description === undefined ? null : input.description,
      input.monthly_price_inr ?? null,
      input.yearly_price_inr ?? null,
      input.monthly_price_usd ?? null,
      input.yearly_price_usd ?? null,
      input.max_campaigns ?? null,
      input.max_numbers ?? null,
      input.max_users ?? null,
      input.max_projects ?? null,
      input.max_integrations ?? null,
      input.max_bots ?? null,
      input.included_users ?? null,
      input.workspace_limit ?? null,
      input.project_limit ?? null,
      input.agent_seat_limit ?? null,
      input.active_bot_limit ?? null,
      input.monthly_campaign_limit ?? null,
      input.ai_reply_limit ?? null,
      input.extra_agent_seat_price_inr ?? null,
      input.pricing_model || null,
      input.support_tier || null,
      input.wallet_pricing ? JSON.stringify(input.wallet_pricing) : null,
      input.allowed_platforms ? JSON.stringify(input.allowed_platforms) : null,
      input.features ? JSON.stringify(input.features) : null,
      input.status || null,
    ]
  );

  return res.rows[0] || null;
}

export async function deactivatePlan(id: string) {
  const res = await query(
    `UPDATE plans
     SET status = 'inactive',
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  return res.rows[0] || null;
}
