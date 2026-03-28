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
  const { createSupportWorkspaceSessionService } = require("../dist/services/authService");
  let actorId = null;
  let ownerId = null;
  let workspaceId = null;
  const nonce = Date.now();

  try {
    actorId = (
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'developer')
         RETURNING id`,
        [`Consent Actor ${nonce}`, `consent-actor-${nonce}@example.test`, "test-hash"]
      )
    ).rows[0].id;

    ownerId = (
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'user')
         RETURNING id`,
        [`Consent Owner ${nonce}`, `consent-owner-${nonce}@example.test`, "test-hash"]
      )
    ).rows[0].id;

    workspaceId = (
      await pool.query(
        `INSERT INTO workspaces (name, owner_user_id, plan_id, status)
         VALUES ($1, $2, 'starter', 'active')
         RETURNING id`,
        [`Consent Workspace ${nonce}`, ownerId]
      )
    ).rows[0].id;

    let rejected = false;
    try {
      await createSupportWorkspaceSessionService({
        actorUserId: actorId,
        workspaceId,
        consentConfirmed: false,
      });
    } catch (error) {
      rejected = /consent/i.test(String(error?.message || error || ""));
    }
    assert(rejected, "Support session should require explicit consent");

    const accepted = await createSupportWorkspaceSessionService({
      actorUserId: actorId,
      workspaceId,
      consentConfirmed: true,
      consentNote: "Customer approved via support ticket TEST-123",
    });

    assert(
      accepted?.activeWorkspace?.permissions_json?.support_mode === true,
      "Support mode should be active after consented session"
    );

    const auditLog = (
      await pool.query(
        `SELECT metadata, new_data
         FROM audit_logs
         WHERE workspace_id = $1
           AND entity = 'support_session'
           AND action = 'enter_support_mode'
         ORDER BY created_at DESC
         LIMIT 1`,
        [workspaceId]
      )
    ).rows[0];

    assert(Boolean(auditLog), "Support session audit log should exist");
    assert(
      String(auditLog?.new_data?.consentNote || "").includes("TEST-123"),
      "Support session audit log should capture consent note"
    );

    console.log("Support session consent test passed.");
  } finally {
    if (workspaceId) {
      await pool.query(`DELETE FROM support_access WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM audit_logs WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
      await pool.query(`DELETE FROM workspace_memberships WHERE workspace_id = $1`, [workspaceId]).catch(() => {});
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
  console.error("Support session consent test failed", error);
  process.exit(1);
});
