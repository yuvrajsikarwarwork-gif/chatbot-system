const path = require("path");
const { Pool } = require("pg");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectFailure(fn, matcher, label) {
  try {
    await fn();
  } catch (error) {
    const message = String(error?.message || error?.response?.data?.error || error || "");
    if (matcher.test(message)) {
      return;
    }
    throw new Error(`${label} failed with unexpected error: ${message}`);
  }

  throw new Error(`${label} was expected to fail`);
}

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.DB_URL;
  if (!connectionString) {
    throw new Error("DB_URL or DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString });
  const {
    assertUserQuota,
    assertProjectQuota,
    assertBotQuota,
    assertPlatformAccountQuota,
    assertCampaignQuota,
  } = require("../dist/services/businessValidationService");
  const {
    recordWorkspaceUsage,
    ensureAiReplyWithinLimit,
  } = require("../dist/services/billingService");
  const {
    assertWorkspacePermission,
    WORKSPACE_PERMISSIONS,
  } = require("../dist/services/workspaceAccessService");
  const {
    updateUserPermissionsService,
  } = require("../dist/services/permissionService");

  const nonce = Date.now();
  const actorEmail = `enforcement-actor-${nonce}@example.test`;
  const editorEmail = `enforcement-editor-${nonce}@example.test`;
  let workspaceId = null;
  let actorId = null;
  let editorId = null;
  let planId = null;

  try {
    actorId = (
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'developer')
         RETURNING id`,
        [`Enforcement Actor ${nonce}`, actorEmail, "test-hash"]
      )
    ).rows[0].id;

    editorId = (
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'user')
         RETURNING id`,
        [`Enforcement Editor ${nonce}`, editorEmail, "test-hash"]
      )
    ).rows[0].id;

    planId = `enforcement-plan-${nonce}`;
    await pool.query(
      `INSERT INTO plans (
         id, name, description,
         monthly_price_inr, yearly_price_inr, monthly_price_usd, yearly_price_usd,
         max_campaigns, max_numbers, max_users, max_projects, max_integrations, max_bots,
         included_users, workspace_limit, project_limit, agent_seat_limit,
         active_bot_limit, monthly_campaign_limit, ai_reply_limit,
         extra_agent_seat_price_inr, pricing_model, support_tier,
         wallet_pricing, allowed_platforms, features, status
       ) VALUES (
         $1, $2, $3,
         0, 0, 0, 0,
         1, 1, 1, 1, 1, 1,
         1, 1, 1, 1,
         1, 1, 1,
         0, 'standard', 'basic',
         '{}'::jsonb, '["whatsapp","telegram","instagram","facebook","website"]'::jsonb, '{}'::jsonb, 'active'
       )`,
      [planId, `Enforcement Plan ${nonce}`, "Temporary enforcement plan"]
    );

    workspaceId = (
      await pool.query(
        `INSERT INTO workspaces (
           name, owner_user_id, plan_id, status,
           agent_seat_limit_override, project_limit_override,
           active_bot_limit_override, monthly_campaign_limit_override,
           max_numbers_override, ai_reply_limit_override
         ) VALUES (
           $1, $2, $3, 'active',
           1, 1, 1, 1, 1, 1
         )
         RETURNING id`,
        [`Enforcement Workspace ${nonce}`, actorId, planId]
      )
    ).rows[0].id;

    await pool.query(`UPDATE users SET workspace_id = $1 WHERE id = $2`, [workspaceId, editorId]);
    await pool.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role, status, created_by)
       VALUES
         ($1, $2, 'workspace_admin', 'active', $2),
         ($1, $3, 'editor', 'active', $2)`,
      [workspaceId, actorId, editorId]
    );

    await pool.query(
      `INSERT INTO billing_subscriptions (
         workspace_id, plan_id, status, billing_cycle, currency, base_price_amount,
         seat_quantity, included_seat_limit, extra_seat_quantity, extra_seat_unit_price,
         ai_reply_limit, ai_overage_unit_price, metadata
       ) VALUES (
         $1, $2, 'active', 'monthly', 'INR', 0,
         1, 1, 0, 0,
         1, 0, '{}'::jsonb
       )`,
      [workspaceId, planId]
    );

    await expectFailure(
      () => assertUserQuota(workspaceId),
      /User limit reached/i,
      "user quota"
    );

    await pool.query(
      `UPDATE workspaces
       SET agent_seat_limit_override = 3
       WHERE id = $1`,
      [workspaceId]
    );
    await assertUserQuota(workspaceId);

    const projectId = (
      await pool.query(
        `INSERT INTO projects (workspace_id, name, status)
         VALUES ($1, $2, 'active')
         RETURNING id`,
        [workspaceId, `Enforcement Project ${nonce}`]
      )
    ).rows[0].id;

    await expectFailure(
      () => assertProjectQuota(workspaceId),
      /Project limit reached/i,
      "project quota"
    );

    await pool.query(
      `UPDATE workspaces
       SET project_limit_override = 2
       WHERE id = $1`,
      [workspaceId]
    );
    await assertProjectQuota(workspaceId);

    const botId = (
      await pool.query(
        `INSERT INTO bots (user_id, name, workspace_id, project_id, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id`,
        [actorId, `Enforcement Bot ${nonce}`, workspaceId, projectId]
      )
    ).rows[0].id;

    await expectFailure(
      () => assertBotQuota(workspaceId, projectId),
      /Bot limit reached/i,
      "bot quota"
    );

    await pool.query(
      `UPDATE workspaces
       SET active_bot_limit_override = 2
       WHERE id = $1`,
      [workspaceId]
    );
    await assertBotQuota(workspaceId, projectId);

    await pool.query(
      `INSERT INTO platform_accounts (
         user_id, workspace_id, project_id, platform_type, name, account_id, token, status, metadata
       ) VALUES (
         $1, $2, $3, 'whatsapp', $4, $5, NULL, 'active', '{}'::jsonb
       )`,
      [actorId, workspaceId, projectId, `Enforcement WhatsApp ${nonce}`, `wa-${nonce}`]
    );

    await expectFailure(
      () => assertPlatformAccountQuota(actorId, workspaceId),
      /Platform account limit reached/i,
      "platform account quota"
    );

    await pool.query(
      `UPDATE workspaces
       SET max_numbers_override = 2
       WHERE id = $1`,
      [workspaceId]
    );
    await assertPlatformAccountQuota(actorId, workspaceId);

    await pool.query(
      `INSERT INTO campaigns (
         user_id, name, slug, workspace_id, project_id, status, metadata
       ) VALUES (
         $1, $2, $3, $4, $5, 'draft', '{}'::jsonb
       )`,
      [actorId, `Enforcement Campaign ${nonce}`, `enforcement-campaign-${nonce}`, workspaceId, projectId]
    );

    await expectFailure(
      () => assertCampaignQuota(actorId, workspaceId),
      /Campaign limit reached/i,
      "campaign quota"
    );

    await pool.query(
      `UPDATE workspaces
       SET monthly_campaign_limit_override = 2
       WHERE id = $1`,
      [workspaceId]
    );
    await assertCampaignQuota(actorId, workspaceId);

    await recordWorkspaceUsage({
      workspaceId,
      metricKey: "ai_replies",
      quantity: 1,
      metadata: { source: "test" },
    });
    const aiLimitReached = await ensureAiReplyWithinLimit(workspaceId);
    assert(aiLimitReached.overage === true, "AI reply usage should show overage at the configured limit");

    await pool.query(
      `UPDATE workspaces
       SET ai_reply_limit_override = 2
       WHERE id = $1`,
      [workspaceId]
    );
    const aiLimitRelaxed = await ensureAiReplyWithinLimit(workspaceId);
    assert(aiLimitRelaxed.overage === false, "AI reply override should relax enforcement");

    await expectFailure(
      () =>
        assertWorkspacePermission(
          editorId,
          workspaceId,
          WORKSPACE_PERMISSIONS.managePermissions
        ),
      /Forbidden/i,
      "editor manage-permissions access before override"
    );

    await updateUserPermissionsService({
      actorUserId: actorId,
      workspaceId,
      userId: editorId,
      permissions: {
        manage_permissions: true,
      },
    });
    await assertWorkspacePermission(
      editorId,
      workspaceId,
      WORKSPACE_PERMISSIONS.managePermissions
    );

    await assertWorkspacePermission(
      editorId,
      workspaceId,
      WORKSPACE_PERMISSIONS.createCampaign
    );

    await updateUserPermissionsService({
      actorUserId: actorId,
      workspaceId,
      userId: editorId,
      permissions: {
        can_create_campaign: false,
      },
    });

    await expectFailure(
      () =>
        assertWorkspacePermission(
          editorId,
          workspaceId,
          WORKSPACE_PERMISSIONS.createCampaign
        ),
      /Forbidden/i,
      "editor create-campaign access after deny override"
    );

    console.log("Workspace enforcement test passed.");
  } finally {
    if (workspaceId) {
      await pool.query(`DELETE FROM usage_counters WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM user_permissions WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM audit_logs WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM platform_accounts WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM campaigns WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM bots WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM project_settings WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = $1)`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM user_project_access WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM project_users WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM workspace_memberships WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM billing_subscriptions WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM projects WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM workspaces WHERE id = $1`, [workspaceId]).catch(() => {});
    }

    if (planId) {
      await pool.query(`DELETE FROM plans WHERE id = $1`, [planId]).catch(() => {});
    }

    if (editorId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [editorId]).catch(() => {});
    }

    if (actorId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [actorId]).catch(() => {});
    }

    await pool.end();
  }
}

main().catch((error) => {
  console.error("Workspace enforcement test failed", error);
  process.exit(1);
});
