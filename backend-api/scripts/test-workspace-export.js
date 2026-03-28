const fs = require("fs");
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
  const {
    createWorkspaceExportRequestService,
    processWorkspaceExportJobsService,
    downloadWorkspaceExportForUserService,
  } = require("../dist/services/workspaceService");

  const nonce = Date.now();
  const actorEmail = `export-actor-${nonce}@example.test`;
  const ownerEmail = `export-owner-${nonce}@example.test`;
  let workspaceId = null;
  let actorId = null;
  let ownerId = null;
  let exportFilePath = null;

  try {
    actorId = (
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'developer')
         RETURNING id`,
        [`Export Actor ${nonce}`, actorEmail, "test-hash"]
      )
    ).rows[0].id;

    ownerId = (
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'user')
         RETURNING id`,
        [`Export Owner ${nonce}`, ownerEmail, "test-hash"]
      )
    ).rows[0].id;

    workspaceId = (
      await pool.query(
        `INSERT INTO workspaces (name, owner_user_id, plan_id, status)
         VALUES ($1, $2, 'starter', 'archived')
         RETURNING id`,
        [`Export Workspace ${nonce}`, ownerId]
      )
    ).rows[0].id;

    await pool.query(`UPDATE users SET workspace_id = $1 WHERE id = $2`, [workspaceId, ownerId]);
    await pool.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role, status, created_by)
       VALUES ($1, $2, 'admin', 'active', $3)`,
      [workspaceId, ownerId, actorId]
    );
    await pool.query(
      `UPDATE workspaces
       SET deleted_at = NOW(),
           purge_after = NOW() + INTERVAL '30 days'
       WHERE id = $1`,
      [workspaceId]
    );

    const projectId = (
      await pool.query(
        `INSERT INTO projects (workspace_id, name, status)
         VALUES ($1, $2, 'active')
         RETURNING id`,
        [workspaceId, `Export Project ${nonce}`]
      )
    ).rows[0].id;

    const botId = (
      await pool.query(
        `INSERT INTO bots (user_id, name, workspace_id, project_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [ownerId, `Export Bot ${nonce}`, workspaceId, projectId]
      )
    ).rows[0].id;

    await pool.query(
      `INSERT INTO contacts (bot_id, workspace_id, platform_user_id, name)
       VALUES ($1, $2, $3, $4)`,
      [botId, workspaceId, `contact-${nonce}`, `Export Contact ${nonce}`]
    );
    await pool.query(
      `INSERT INTO platform_accounts (
         user_id, workspace_id, project_id, platform_type, name, account_id, token, status, metadata
       ) VALUES ($1, $2, $3, 'telegram', $4, $5, $6, 'inactive', $7::jsonb)`,
      [
        ownerId,
        workspaceId,
        projectId,
        `Export Telegram ${nonce}`,
        `telegram-${nonce}`,
        "plain-token-for-test",
        JSON.stringify({
          softDeleteRevocationReason: "workspace_scheduled_for_deletion",
        }),
      ]
    );

    const queued = await createWorkspaceExportRequestService(workspaceId, actorId);
    assert(queued.queued === true, "Export request should be queued");

    const processed = await processWorkspaceExportJobsService();
    assert(processed.processed === 1, "Export processor should complete one job");

    const queueJob = (
      await pool.query(
        `SELECT id, status, payload
         FROM queue_jobs
         WHERE job_type = 'workspace_export'
           AND payload->>'workspaceId' = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [workspaceId]
      )
    ).rows[0];
    assert(queueJob && queueJob.status === "completed", "Export job should complete");

    const download = await downloadWorkspaceExportForUserService(workspaceId, queueJob.id, actorId);
    exportFilePath = download.filePath;
    assert(fs.existsSync(download.filePath), "Export file should exist on disk");

    const raw = fs.readFileSync(download.filePath, "utf8");
    const parsed = JSON.parse(raw);
    assert(parsed.formatVersion === 2, "Export should include format version");
    assert(Array.isArray(parsed.contacts), "Export should include contacts");
    assert(Array.isArray(parsed.platformAccounts), "Export should include platform accounts");
    assert(parsed.platformAccounts[0]?.token === null, "Export should strip integration tokens");
    assert(parsed.summary?.platformAccounts >= 1, "Export summary should include platform accounts");

    console.log("Workspace export test passed.");
  } finally {
    if (exportFilePath && fs.existsSync(exportFilePath)) {
      fs.unlinkSync(exportFilePath);
    }
    if (workspaceId) {
      await pool.query(`DELETE FROM queue_jobs WHERE payload->>'workspaceId' = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM auth_tokens WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
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
      await pool.query(`DELETE FROM support_requests WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM audit_logs WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
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
  console.error("Workspace export test failed", error);
  process.exit(1);
});
