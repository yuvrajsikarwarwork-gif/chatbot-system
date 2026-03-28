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
    getFlowBuilderCapabilitiesService,
    saveFlowService,
  } = require("../dist/services/flowService");
  const {
    updateUserPermissionsService,
  } = require("../dist/services/permissionService");
  const {
    updateAiProvidersSettingsService,
  } = require("../dist/services/platformSettingsService");

  const nonce = Date.now();
  const actorEmail = `flow-guard-actor-${nonce}@example.test`;
  const editorEmail = `flow-guard-editor-${nonce}@example.test`;
  const settingsKey = "ai_providers";
  let actorId = null;
  let editorId = null;
  let workspaceId = null;
  let projectId = null;
  let botId = null;
  let planId = null;
  let originalSettingsRow = null;

  try {
    await pool.query(
      `INSERT INTO permissions (key, name)
       VALUES ('use_ai_nodes', 'Use AI nodes')
       ON CONFLICT (key) DO NOTHING`
    );

    originalSettingsRow = (
      await pool.query(`SELECT * FROM platform_settings WHERE settings_key = $1 LIMIT 1`, [settingsKey]).catch(() => ({ rows: [] }))
    ).rows[0] || null;

    actorId = (
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'developer')
         RETURNING id`,
        [`Flow Guard Actor ${nonce}`, actorEmail, "test-hash"]
      )
    ).rows[0].id;

    editorId = (
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'user')
         RETURNING id`,
        [`Flow Guard Editor ${nonce}`, editorEmail, "test-hash"]
      )
    ).rows[0].id;

    planId = `flow-guard-plan-${nonce}`;
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
         10, 10, 10, 10, 10, 10,
         10, 10, 10, 10,
         10, 10, 25,
         0, 'standard', 'basic',
         '{}'::jsonb, '["whatsapp","telegram","instagram","facebook","website"]'::jsonb, '{}'::jsonb, 'active'
       )`,
      [planId, `Flow Guard Plan ${nonce}`, "Temporary flow guardrails plan"]
    );

    workspaceId = (
      await pool.query(
        `INSERT INTO workspaces (
           name, owner_user_id, plan_id, status, ai_reply_limit_override
         ) VALUES (
           $1, $2, $3, 'active', 25
         )
         RETURNING id`,
        [`Flow Guard Workspace ${nonce}`, actorId, planId]
      )
    ).rows[0].id;

    projectId = (
      await pool.query(
        `INSERT INTO projects (workspace_id, name, status)
         VALUES ($1, $2, 'active')
         RETURNING id`,
        [workspaceId, `Flow Guard Project ${nonce}`]
      )
    ).rows[0].id;

    botId = (
      await pool.query(
        `INSERT INTO bots (user_id, name, workspace_id, project_id, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id`,
        [actorId, `Flow Guard Bot ${nonce}`, workspaceId, projectId]
      )
    ).rows[0].id;

    await pool.query(`UPDATE users SET workspace_id = $1 WHERE id IN ($2, $3)`, [workspaceId, actorId, editorId]);
    await pool.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role, status, created_by)
       VALUES
         ($1, $2, 'workspace_admin', 'active', $2),
         ($1, $3, 'editor', 'active', $2)`,
      [workspaceId, actorId, editorId]
    );
    await pool.query(
      `INSERT INTO project_users (workspace_id, user_id, project_id, role, status, created_by)
       VALUES ($1, $2, $3, 'editor', 'active', $4)`,
      [workspaceId, editorId, projectId, actorId]
    );
    await pool.query(
      `INSERT INTO user_project_access (workspace_id, user_id, project_id, role, is_all_projects, status, created_by)
       VALUES ($1, $2, $3, 'editor', false, 'active', $4)`,
      [workspaceId, editorId, projectId, actorId]
    );

    await pool.query(
      `INSERT INTO billing_subscriptions (
         workspace_id, plan_id, status, billing_cycle, currency, base_price_amount,
         seat_quantity, included_seat_limit, extra_seat_quantity, extra_seat_unit_price,
         ai_reply_limit, ai_overage_unit_price, metadata
       ) VALUES (
         $1, $2, 'active', 'monthly', 'INR', 0,
         2, 10, 0, 0,
         25, 0, '{}'::jsonb
       )`,
      [workspaceId, planId]
    );

    await updateAiProvidersSettingsService({
      userId: actorId,
      defaultProvider: "openai",
      defaultModel: "gpt-5.4-mini",
      fallbackProvider: "gemini",
      fallbackModel: "gemini-1.5-pro",
      openaiModel: "gpt-5.4-mini",
      geminiModel: "gemini-1.5-pro",
      temperature: 0.2,
      maxOutputTokens: 512,
      openaiApiKey: "test-openai-key",
      geminiApiKey: null,
    });

    const capabilities = await getFlowBuilderCapabilitiesService(botId, editorId);
    assert(
      Array.isArray(capabilities.allowedNodeTypes) &&
        capabilities.allowedNodeTypes.includes("knowledge_lookup"),
      "Editor should see AI knowledge node when AI is configured and permission is allowed"
    );

    const aiFlow = {
      nodes: [
        {
          id: "node-start",
          type: "start",
          position: { x: 50, y: 50 },
          data: { label: "Start" },
        },
        {
          id: "node-ai",
          type: "knowledge_lookup",
          position: { x: 280, y: 50 },
          data: {
            label: "AI Knowledge",
            query: "shipping policy",
            saveTo: "knowledge_results",
            saveTextTo: "knowledge_text",
            scope: "workspace",
            limit: 3,
          },
        },
      ],
      edges: [
        {
          id: "edge-start-ai",
          source: "node-start",
          target: "node-ai",
        },
      ],
    };

    const saved = await saveFlowService(botId, editorId, aiFlow, undefined, "AI Guard Flow");
    assert(saved?.id, "Saving a valid AI knowledge flow should succeed");

    await updateUserPermissionsService({
      actorUserId: actorId,
      workspaceId,
      userId: editorId,
      permissions: {
        use_ai_nodes: false,
      },
    });

    const restrictedCapabilities = await getFlowBuilderCapabilitiesService(botId, editorId);
    assert(
      !restrictedCapabilities.allowedNodeTypes.includes("knowledge_lookup"),
      "AI knowledge node should disappear once the explicit permission override is disabled"
    );

    await expectFailure(
      () => saveFlowService(botId, editorId, aiFlow, undefined, "Blocked AI Flow"),
      /AI node permission is disabled|not available/i,
      "saving AI node without permission"
    );

    await expectFailure(
      () =>
        saveFlowService(
          botId,
          editorId,
          {
            nodes: [
              { id: "node-start", type: "start", position: { x: 0, y: 0 }, data: {} },
              { id: "node-bad", type: "totally_unknown_node", position: { x: 120, y: 0 }, data: {} },
            ],
            edges: [{ id: "edge", source: "node-start", target: "node-bad" }],
          },
          undefined,
          "Unsupported Flow"
        ),
      /Unsupported workflow node type/i,
      "saving unsupported node type"
    );

    console.log("Flow builder guardrails test passed.");
  } finally {
    if (originalSettingsRow) {
      await pool.query(
        `UPDATE platform_settings
         SET settings_json = $2, updated_by = NULL, updated_at = NOW()
         WHERE settings_key = $1`,
        [settingsKey, originalSettingsRow.settings_json]
      ).catch(() => {});
    } else {
      await pool.query(`DELETE FROM platform_settings WHERE settings_key = $1`, [settingsKey]).catch(() => {});
    }

    if (botId) {
      await pool.query(`DELETE FROM flow_nodes WHERE flow_id IN (SELECT id FROM flows WHERE bot_id = $1)`, [botId]).catch(() => {});
      await pool.query(`DELETE FROM flows WHERE bot_id = $1`, [botId]).catch(() => {});
      await pool.query(`DELETE FROM bots WHERE id = $1`, [botId]).catch(() => {});
    }

    if (workspaceId) {
      await pool.query(`DELETE FROM billing_subscriptions WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM user_permissions WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM user_project_access WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM project_users WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM workspace_memberships WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
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
  console.error("Flow builder guardrails test failed", error);
  process.exit(1);
});
