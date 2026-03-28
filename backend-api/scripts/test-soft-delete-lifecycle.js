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
  const { deleteWorkspaceService, restoreWorkspaceService, purgeSoftDeletedWorkspacesService } =
    require("../dist/services/workspaceService");
  const { findWorkspacesByUser } = require("../dist/models/workspaceModel");

  const nonce = Date.now();
  const actorEmail = `soft-delete-actor-${nonce}@example.test`;
  const ownerEmail = `soft-delete-owner-${nonce}@example.test`;
  let workspaceId = null;
  let actorId = null;
  let ownerId = null;

  try {
    const actorRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'developer')
       RETURNING id`,
      [`Soft Delete Actor ${nonce}`, actorEmail, "test-hash"]
    );
    actorId = actorRes.rows[0].id;

    const ownerRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id`,
      [`Soft Delete Owner ${nonce}`, ownerEmail, "test-hash"]
    );
    ownerId = ownerRes.rows[0].id;

    const workspaceRes = await pool.query(
      `INSERT INTO workspaces (name, owner_user_id, plan_id, status)
       VALUES ($1, $2, 'starter', 'active')
       RETURNING id`,
      [`Soft Delete Workspace ${nonce}`, ownerId]
    );
    workspaceId = workspaceRes.rows[0].id;

    await pool.query(`UPDATE users SET workspace_id = $1 WHERE id = $2`, [workspaceId, ownerId]);
    await pool.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role, status, created_by)
       VALUES ($1, $2, 'admin', 'active', $3)`,
      [workspaceId, ownerId, actorId]
    );

    const projectRes = await pool.query(
      `INSERT INTO projects (workspace_id, name, status)
       VALUES ($1, $2, 'active')
       RETURNING id`,
      [workspaceId, `Recovery Project ${nonce}`]
    );
    const projectId = projectRes.rows[0].id;

    const botRes = await pool.query(
      `INSERT INTO bots (user_id, name, workspace_id, project_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [ownerId, `Recovery Bot ${nonce}`, workspaceId, projectId]
    );
    const botId = botRes.rows[0].id;

    const campaignRes = await pool.query(
      `INSERT INTO campaigns (user_id, name, slug, workspace_id, project_id, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING id`,
      [ownerId, `Recovery Campaign ${nonce}`, `recovery-campaign-${nonce}`, workspaceId, projectId]
    );
    const campaignId = campaignRes.rows[0].id;

    await pool.query(
      `INSERT INTO leads (user_id, bot_id, campaign_id, workspace_id, project_id, name, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [ownerId, botId, campaignId, workspaceId, projectId, `Lead ${nonce}`, `555${nonce}`.slice(0, 15)]
    );

    const contactRes = await pool.query(
      `INSERT INTO contacts (bot_id, workspace_id, platform_user_id, name)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [botId, workspaceId, `user-${nonce}`, `Lead ${nonce}`]
    );
    const contactId = contactRes.rows[0].id;

    await pool.query(
      `INSERT INTO conversations (
         bot_id, workspace_id, project_id, contact_id, channel, platform, contact_name, contact_phone, status, variables
       ) VALUES ($1, $2, $3, $4, 'whatsapp', 'whatsapp', $5, $6, 'active', '{}'::jsonb)`,
      [botId, workspaceId, projectId, contactId, `Lead ${nonce}`, `user-${nonce}`]
    );

    await pool.query(
      `INSERT INTO platform_accounts (
         user_id, workspace_id, project_id, platform_type, name, phone_number, account_id, token, status
       ) VALUES ($1, $2, $3, 'whatsapp', $4, $5, $6, $7, 'active')`,
      [ownerId, workspaceId, projectId, `WhatsApp ${nonce}`, `+91555${nonce}`.slice(0, 20), `acct-${nonce}`, "secret-token"]
    );

    const deleted = await deleteWorkspaceService(workspaceId, actorId);
    assert(deleted.deleted_at, "Workspace should get deleted_at when scheduled for deletion");
    assert(deleted.purge_after, "Workspace should get purge_after when scheduled for deletion");

    const childState = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM projects WHERE workspace_id = $1 AND deleted_at IS NOT NULL) AS deleted_projects,
         (SELECT COUNT(*)::int FROM campaigns WHERE workspace_id = $1 AND deleted_at IS NOT NULL) AS deleted_campaigns,
         (SELECT COUNT(*)::int FROM bots WHERE workspace_id = $1 AND deleted_at IS NOT NULL) AS deleted_bots,
         (SELECT COUNT(*)::int FROM leads WHERE workspace_id = $1 AND deleted_at IS NOT NULL) AS deleted_leads,
         (SELECT COUNT(*)::int FROM conversations WHERE workspace_id = $1 AND deleted_at IS NOT NULL) AS deleted_conversations,
         (SELECT COUNT(*)::int FROM platform_accounts WHERE workspace_id = $1 AND status = 'inactive' AND token IS NULL) AS revoked_accounts`,
      [workspaceId]
    );
    const row = childState.rows[0];
    assert(Number(row.deleted_projects) === 1, "Project should be soft-deleted");
    assert(Number(row.deleted_campaigns) === 1, "Campaign should be soft-deleted");
    assert(Number(row.deleted_bots) === 1, "Bot should be soft-deleted");
    assert(Number(row.deleted_leads) === 1, "Lead should be soft-deleted");
    assert(Number(row.deleted_conversations) === 1, "Conversation should be soft-deleted");
    assert(Number(row.revoked_accounts) === 1, "Platform token should be revoked on soft-delete");

    const hiddenWorkspaces = await findWorkspacesByUser(ownerId);
    assert(
      !hiddenWorkspaces.some((workspace) => workspace.id === workspaceId),
      "Soft-deleted workspace should be hidden from workspace listings"
    );

    const restored = await restoreWorkspaceService(workspaceId, actorId);
    assert(restored && !restored.deleted_at, "Restore should clear workspace deleted_at");

    const restoredState = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM projects WHERE workspace_id = $1 AND deleted_at IS NULL) AS active_projects,
         (SELECT COUNT(*)::int FROM campaigns WHERE workspace_id = $1 AND deleted_at IS NULL) AS active_campaigns,
         (SELECT COUNT(*)::int FROM bots WHERE workspace_id = $1 AND deleted_at IS NULL) AS active_bots,
         (SELECT COUNT(*)::int FROM leads WHERE workspace_id = $1 AND deleted_at IS NULL) AS active_leads,
         (SELECT COUNT(*)::int FROM conversations WHERE workspace_id = $1 AND deleted_at IS NULL) AS active_conversations`,
      [workspaceId]
    );
    const restoredRow = restoredState.rows[0];
    assert(Number(restoredRow.active_projects) === 1, "Restore should reactivate project visibility");
    assert(Number(restoredRow.active_campaigns) === 1, "Restore should reactivate campaign visibility");
    assert(Number(restoredRow.active_bots) === 1, "Restore should reactivate bot visibility");
    assert(Number(restoredRow.active_leads) === 1, "Restore should reactivate lead visibility");
    assert(Number(restoredRow.active_conversations) === 1, "Restore should reactivate conversation visibility");

    const visibleWorkspaces = await findWorkspacesByUser(ownerId);
    assert(
      visibleWorkspaces.some((workspace) => workspace.id === workspaceId),
      "Restored workspace should return to workspace listings"
    );

    await deleteWorkspaceService(workspaceId, actorId);
    await pool.query(
      `UPDATE workspaces
       SET purge_after = NOW() - INTERVAL '1 minute'
       WHERE id = $1`,
      [workspaceId]
    );

    const purgeResult = await purgeSoftDeletedWorkspacesService();
    assert(purgeResult.purged >= 1, "Purge worker should remove due soft-deleted workspaces");

    const missingWorkspace = await pool.query(`SELECT 1 FROM workspaces WHERE id = $1`, [workspaceId]);
    assert(missingWorkspace.rowCount === 0, "Purged workspace should be removed permanently");

    console.log("Soft-delete lifecycle test passed.");
  } finally {
    if (workspaceId) {
      await pool.query(`DELETE FROM queue_jobs WHERE payload->>'workspaceId' = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM auth_tokens WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM support_requests WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM support_access WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM platform_accounts WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM contacts WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM conversations WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM leads WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM bots WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM campaigns WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM project_settings WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = $1)`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM user_project_access WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM project_users WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM workspace_memberships WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM projects WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM workspaces WHERE id = $1`, [workspaceId]).catch(() => {});
    }

    if (ownerId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [ownerId]).catch(() => {});
    }

    if (actorId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [actorId]).catch(() => {});
    }

    await pool.end();
  }
}

main().catch((error) => {
  console.error("Soft-delete lifecycle test failed", error);
  process.exit(1);
});
