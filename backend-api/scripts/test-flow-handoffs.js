const path = require("path");
const { Pool } = require("pg");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.DB_URL;
  if (!connectionString) {
    throw new Error("DB_URL or DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString });
  const { executeFlowFromNode } = require("../dist/services/flowEngine");

  const nonce = Date.now();
  const actorEmail = `flow-handoff-actor-${nonce}@example.test`;
  const planId = `flow-handoff-plan-${nonce}`;

  let actorId = null;
  let workspaceId = null;
  let projectId = null;
  let botAId = null;
  let botBId = null;
  let flowSameTargetId = null;
  let flowCrossTargetId = null;
  let flowSameSourceId = null;
  let flowCrossSourceId = null;
  let contactId = null;
  let conversationId = null;

  try {
    actorId = (
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'developer')
         RETURNING id`,
        [`Flow Handoff Actor ${nonce}`, actorEmail, "test-hash"]
      )
    ).rows[0].id;

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
      [planId, `Flow Handoff Plan ${nonce}`, "Temporary handoff test plan"]
    );

    workspaceId = (
      await pool.query(
        `INSERT INTO workspaces (name, owner_user_id, plan_id, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id`,
        [`Flow Handoff Workspace ${nonce}`, actorId, planId]
      )
    ).rows[0].id;

    projectId = (
      await pool.query(
        `INSERT INTO projects (workspace_id, name, status)
         VALUES ($1, $2, 'active')
         RETURNING id`,
        [workspaceId, `Flow Handoff Project ${nonce}`]
      )
    ).rows[0].id;

    botAId = (
      await pool.query(
        `INSERT INTO bots (user_id, name, workspace_id, project_id, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id`,
        [actorId, `Flow Handoff Bot A ${nonce}`, workspaceId, projectId]
      )
    ).rows[0].id;

    botBId = (
      await pool.query(
        `INSERT INTO bots (user_id, name, workspace_id, project_id, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id`,
        [actorId, `Flow Handoff Bot B ${nonce}`, workspaceId, projectId]
      )
    ).rows[0].id;

    const sameBotTargetFlow = {
      nodes: [
        { id: "start-same", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
        { id: "msg-same", type: "msg_text", position: { x: 200, y: 0 }, data: { label: "Target", text: "Reached same-bot target flow" } },
      ],
      edges: [{ id: "edge-start-same", source: "start-same", target: "msg-same" }],
    };
    flowSameTargetId = (
      await pool.query(
        `INSERT INTO flows (bot_id, flow_name, flow_json, is_default, is_active)
         VALUES ($1, $2, $3::jsonb, true, true)
         RETURNING id`,
        [botAId, `Same Bot Target ${nonce}`, JSON.stringify(sameBotTargetFlow)]
      )
    ).rows[0].id;

    const crossBotTargetFlow = {
      nodes: [
        { id: "start-cross", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
        { id: "msg-cross", type: "msg_text", position: { x: 200, y: 0 }, data: { label: "Target", text: "Reached other bot target flow" } },
      ],
      edges: [{ id: "edge-start-cross", source: "start-cross", target: "msg-cross" }],
    };
    flowCrossTargetId = (
      await pool.query(
        `INSERT INTO flows (bot_id, flow_name, flow_json, is_default, is_active)
         VALUES ($1, $2, $3::jsonb, true, true)
         RETURNING id`,
        [botBId, `Other Bot Target ${nonce}`, JSON.stringify(crossBotTargetFlow)]
      )
    ).rows[0].id;

    const sameBotSourceFlow = {
      nodes: [
        { id: "start-source-same", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
        {
          id: "goto-flow",
          type: "goto",
          position: { x: 200, y: 0 },
          data: { label: "Go To Flow", gotoType: "flow", targetFlowId: flowSameTargetId },
        },
      ],
      edges: [{ id: "edge-source-same", source: "start-source-same", target: "goto-flow" }],
    };
    flowSameSourceId = (
      await pool.query(
        `INSERT INTO flows (bot_id, flow_name, flow_json, is_default, is_active)
         VALUES ($1, $2, $3::jsonb, false, true)
         RETURNING id`,
        [botAId, `Same Bot Source ${nonce}`, JSON.stringify(sameBotSourceFlow)]
      )
    ).rows[0].id;

    const crossBotSourceFlow = {
      nodes: [
        { id: "start-source-cross", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
        {
          id: "goto-bot",
          type: "goto",
          position: { x: 200, y: 0 },
          data: { label: "Go To Bot", gotoType: "bot", targetBotId: botBId, targetFlowId: flowCrossTargetId },
        },
      ],
      edges: [{ id: "edge-source-cross", source: "start-source-cross", target: "goto-bot" }],
    };
    flowCrossSourceId = (
      await pool.query(
        `INSERT INTO flows (bot_id, flow_name, flow_json, is_default, is_active)
         VALUES ($1, $2, $3::jsonb, false, true)
         RETURNING id`,
        [botAId, `Other Bot Source ${nonce}`, JSON.stringify(crossBotSourceFlow)]
      )
    ).rows[0].id;

    contactId = (
      await pool.query(
        `INSERT INTO contacts (bot_id, workspace_id, name, platform_user_id, phone, email)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [botAId, workspaceId, `Flow Handoff Contact ${nonce}`, `wa-user-${nonce}`, `+919999${String(nonce).slice(-6)}`, `handoff-${nonce}@example.test`]
      )
    ).rows[0].id;

    conversationId = (
      await pool.query(
        `INSERT INTO conversations
           (bot_id, workspace_id, project_id, contact_id, channel, status, variables, flow_id, platform, context_json)
         VALUES
           ($1, $2, $3, $4, 'whatsapp', 'active', '{}'::jsonb, $5, 'whatsapp', '{}'::jsonb)
         RETURNING id`,
        [botAId, workspaceId, projectId, contactId, flowSameSourceId]
      )
    ).rows[0].id;

    const sameBotActions = await executeFlowFromNode(
      sameBotSourceFlow.nodes[1],
      conversationId,
      botAId,
      `wa-user-${nonce}`,
      sameBotSourceFlow.nodes,
      sameBotSourceFlow.edges,
      "whatsapp",
      null
    );

    const sameConversation = (
      await pool.query(`SELECT bot_id, flow_id, current_node FROM conversations WHERE id = $1`, [conversationId])
    ).rows[0];

    assert(
      sameBotActions.some((action) => action?.text === "Reached same-bot target flow"),
      "Same-bot flow handoff should execute the target flow message"
    );
    assert(
      String(sameConversation.flow_id) === String(flowSameTargetId),
      "Same-bot flow handoff should move the conversation to the target flow"
    );

    await pool.query(
      `UPDATE conversations
       SET bot_id = $1,
           workspace_id = $2,
           project_id = $3,
           contact_id = $4,
           flow_id = $5,
           current_node = NULL,
           variables = '{}'::jsonb,
           context_json = '{}'::jsonb,
           updated_at = NOW()
       WHERE id = $6`,
      [botAId, workspaceId, projectId, contactId, flowCrossSourceId, conversationId]
    );

    const crossBotActions = await executeFlowFromNode(
      crossBotSourceFlow.nodes[1],
      conversationId,
      botAId,
      `wa-user-${nonce}`,
      crossBotSourceFlow.nodes,
      crossBotSourceFlow.edges,
      "whatsapp",
      null
    );

    const crossConversation = (
      await pool.query(`SELECT bot_id, flow_id, contact_id FROM conversations WHERE id = $1`, [conversationId])
    ).rows[0];

    assert(
      crossBotActions.some((action) => action?.text === "Reached other bot target flow"),
      "Inter-bot handoff should execute the target bot flow message"
    );
    assert(
      String(crossConversation.bot_id) === String(botBId),
      "Inter-bot handoff should move the conversation to the target bot"
    );
    assert(
      String(crossConversation.flow_id) === String(flowCrossTargetId),
      "Inter-bot handoff should move the conversation to the target bot flow"
    );
    assert(
      String(crossConversation.contact_id) !== String(contactId),
      "Inter-bot handoff should create or link a contact under the target bot"
    );

    console.log("Flow handoff test passed.");
  } finally {
    if (conversationId) {
      await pool.query(`DELETE FROM conversations WHERE id = $1`, [conversationId]).catch(() => {});
    }
    if (workspaceId) {
      await pool.query(`DELETE FROM contact_identities WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM contacts WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM flow_nodes WHERE flow_id IN (SELECT id FROM flows WHERE bot_id IN ($1, $2))`, [botAId, botBId]).catch(() => {});
      await pool.query(`DELETE FROM flows WHERE bot_id IN ($1, $2)`, [botAId, botBId]).catch(() => {});
      await pool.query(`DELETE FROM bots WHERE id IN ($1, $2)`, [botAId, botBId]).catch(() => {});
      await pool.query(`DELETE FROM projects WHERE id = $1`, [projectId]).catch(() => {});
      await pool.query(`DELETE FROM workspaces WHERE id = $1`, [workspaceId]).catch(() => {});
    }
    if (planId) {
      await pool.query(`DELETE FROM plans WHERE id = $1`, [planId]).catch(() => {});
    }
    if (actorId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [actorId]).catch(() => {});
    }
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Flow handoff test failed", error);
  process.exit(1);
});
