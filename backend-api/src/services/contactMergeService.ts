import { PoolClient } from "pg";

import { db, query } from "../config/db";
import {
  normalizeWhatsAppPlatformUserId,
} from "./contactIdentityService";

type RepairOptions = {
  workspaceId: string;
  botId?: string | null;
  projectId?: string | null;
  dryRun?: boolean;
};

type ContactCandidate = {
  id: string;
  bot_id: string;
  workspace_id: string | null;
  name: string | null;
  phone: string | null;
  platform_user_id: string | null;
  updated_at: string | null;
  created_at: string | null;
  conversation_count: number;
  lead_count: number;
  latest_activity_at: string | null;
};

type ConversationRow = {
  id: string;
  bot_id: string;
  channel: string;
  campaign_id: string | null;
  channel_id: string | null;
  entry_point_id: string | null;
  flow_id: string | null;
  list_id: string | null;
  status: string | null;
  unread_count: number | null;
  last_message_at: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  updated_at: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  assignment_mode: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  context_json: Record<string, unknown> | null;
  platform_account_id: string | null;
  workspace_id: string | null;
  project_id: string | null;
};

type DuplicateGroupSummary = {
  normalizedNumber: string;
  canonicalContactId: string;
  mergedContactIds: string[];
  mergedConversationIds: string[];
  repointedConversationIds: string[];
};

export type WhatsAppContactRepairResult = {
  dryRun: boolean;
  groupsScanned: number;
  duplicateGroupsFound: number;
  canonicalContactsKept: number;
  mergedContacts: number;
  mergedConversations: number;
  repointedConversations: number;
  groups: DuplicateGroupSummary[];
};

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

function normalizeWhatsappNumberFromCandidate(candidate: ContactCandidate) {
  return (
    normalizeWhatsAppPlatformUserId(candidate.phone) ||
    normalizeWhatsAppPlatformUserId(candidate.platform_user_id) ||
    null
  );
}

function conversationContextKey(row: ConversationRow) {
  return [
    row.bot_id,
    row.channel,
    row.campaign_id || EMPTY_UUID,
    row.channel_id || EMPTY_UUID,
    row.entry_point_id || EMPTY_UUID,
    row.flow_id || EMPTY_UUID,
    row.list_id || EMPTY_UUID,
  ].join(":");
}

function pickCanonicalContact(group: ContactCandidate[]) {
  const picked = [...group].sort((left, right) => {
    if (right.conversation_count !== left.conversation_count) {
      return right.conversation_count - left.conversation_count;
    }
    if (right.lead_count !== left.lead_count) {
      return right.lead_count - left.lead_count;
    }
    const rightActivity = new Date(right.latest_activity_at || right.updated_at || right.created_at || 0).getTime();
    const leftActivity = new Date(left.latest_activity_at || left.updated_at || left.created_at || 0).getTime();
    if (rightActivity !== leftActivity) {
      return rightActivity - leftActivity;
    }
    return new Date(left.created_at || 0).getTime() - new Date(right.created_at || 0).getTime();
  })[0];

  if (!picked) {
    throw new Error("Cannot select a canonical contact from an empty group.");
  }

  return picked;
}

async function tableExists(client: PoolClient, tableName: string) {
  const res = await client.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = $1
     ) AS present`,
    [tableName]
  );
  return Boolean(res.rows[0]?.present);
}

async function loadContactConversations(client: PoolClient, contactId: string) {
  const res = await client.query<ConversationRow>(
    `SELECT
       id,
       bot_id,
       channel,
       campaign_id,
       channel_id,
       entry_point_id,
       flow_id,
       list_id,
       status,
       unread_count,
       last_message_at,
       last_inbound_at,
       last_outbound_at,
       updated_at,
       assigned_to,
       assigned_at,
       assignment_mode,
       contact_name,
       contact_phone,
       context_json,
       platform_account_id,
       workspace_id,
       project_id
     FROM conversations
     WHERE contact_id = $1
       AND channel = 'whatsapp'
     ORDER BY updated_at DESC NULLS LAST, created_at DESC`,
    [contactId]
  );

  return res.rows;
}

async function mergeConversationRecords(
  client: PoolClient,
  target: ConversationRow,
  source: ConversationRow
) {
  await client.query(
    `UPDATE messages SET conversation_id = $1 WHERE conversation_id = $2`,
    [target.id, source.id]
  );

  const simpleConversationTables = [
    "analytics_events",
    "conversation_events",
    "conversation_notes",
    "support_surveys",
    "wallet_transactions",
    "agent_tickets",
  ];

  for (const tableName of simpleConversationTables) {
    if (!(await tableExists(client, tableName))) {
      continue;
    }
    await client.query(
      `UPDATE ${tableName}
       SET conversation_id = $1
       WHERE conversation_id = $2`,
      [target.id, source.id]
    );
  }

  if (await tableExists(client, "conversation_tags")) {
    await client.query(
      `INSERT INTO conversation_tags (conversation_id, workspace_id, tag, created_by, created_at)
       SELECT $1, workspace_id, tag, created_by, created_at
       FROM conversation_tags
       WHERE conversation_id = $2
       ON CONFLICT (conversation_id, tag) DO NOTHING`,
      [target.id, source.id]
    );
    await client.query(`DELETE FROM conversation_tags WHERE conversation_id = $1`, [source.id]);
  }

  if (await tableExists(client, "assignments")) {
    const targetActive = await client.query(
      `SELECT id
       FROM assignments
       WHERE conversation_id = $1
         AND status = 'active'
       LIMIT 1`,
      [target.id]
    );

    if (targetActive.rows[0]) {
      await client.query(
        `UPDATE assignments
         SET
           status = CASE WHEN status = 'active' THEN 'released' ELSE status END,
           released_at = CASE WHEN status = 'active' THEN NOW() ELSE released_at END,
           notes = CONCAT(COALESCE(notes, ''), CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE E'\\n' END, 'Released during duplicate conversation merge.')
         WHERE conversation_id = $1
           AND status = 'active'`,
        [source.id]
      );
    }

    await client.query(
      `UPDATE assignments
       SET conversation_id = $1
       WHERE conversation_id = $2
         AND NOT (
           status = 'active'
           AND EXISTS (
             SELECT 1
             FROM assignments a2
             WHERE a2.conversation_id = $1
               AND a2.status = 'active'
           )
         )`,
      [target.id, source.id]
    );
  }

  await client.query(
    `UPDATE conversations
     SET
       status = CASE
         WHEN status = 'agent_pending' OR $2 = 'agent_pending' THEN 'agent_pending'
         WHEN status = 'active' OR $2 = 'active' THEN 'active'
         ELSE status
       END,
       unread_count = COALESCE(unread_count, 0) + COALESCE($3, 0),
       last_message_at = GREATEST(COALESCE(last_message_at, TO_TIMESTAMP(0)), COALESCE($4::timestamptz, TO_TIMESTAMP(0))),
       last_inbound_at = GREATEST(COALESCE(last_inbound_at, TO_TIMESTAMP(0)), COALESCE($5::timestamptz, TO_TIMESTAMP(0))),
       last_outbound_at = GREATEST(COALESCE(last_outbound_at, TO_TIMESTAMP(0)), COALESCE($6::timestamptz, TO_TIMESTAMP(0))),
       assigned_to = COALESCE(assigned_to, $7),
       assigned_at = COALESCE(assigned_at, $8::timestamptz),
       assignment_mode = COALESCE(assignment_mode, $9),
       contact_name = COALESCE(NULLIF(contact_name, ''), NULLIF($10, '')),
       contact_phone = COALESCE(NULLIF(contact_phone, ''), NULLIF($11, '')),
       platform_account_id = COALESCE(platform_account_id, $12),
       workspace_id = COALESCE(workspace_id, $13),
       project_id = COALESCE(project_id, $14),
       context_json = COALESCE(context_json, '{}'::jsonb) || COALESCE($15::jsonb, '{}'::jsonb),
       updated_at = GREATEST(COALESCE(updated_at, TO_TIMESTAMP(0)), COALESCE($16::timestamptz, TO_TIMESTAMP(0)))
     WHERE id = $1`,
    [
      target.id,
      source.status || null,
      source.unread_count || 0,
      source.last_message_at,
      source.last_inbound_at,
      source.last_outbound_at,
      source.assigned_to,
      source.assigned_at,
      source.assignment_mode,
      source.contact_name,
      source.contact_phone,
      source.platform_account_id,
      source.workspace_id,
      source.project_id,
      source.context_json ? JSON.stringify(source.context_json) : null,
      source.updated_at,
    ]
  );

  await client.query(`DELETE FROM conversations WHERE id = $1`, [source.id]);
}

export async function repairWhatsAppContactDuplicates(
  options: RepairOptions
): Promise<WhatsAppContactRepairResult> {
  const filters: string[] = ["c.workspace_id = $1"];
  const params: any[] = [options.workspaceId];

  if (options.botId) {
    params.push(options.botId);
    filters.push(`c.bot_id = $${params.length}`);
  }

  if (options.projectId) {
    params.push(options.projectId);
    filters.push(`cv.project_id = $${params.length}`);
  }

  const candidatesRes = (await query(
    `SELECT
       c.id,
       c.bot_id,
       c.workspace_id,
       c.name,
       c.phone,
       c.platform_user_id,
       c.updated_at,
       c.created_at,
       COUNT(DISTINCT cv.id)::int AS conversation_count,
       COUNT(DISTINCT l.id)::int AS lead_count,
       MAX(GREATEST(
         COALESCE(cv.updated_at, cv.created_at, c.updated_at, c.created_at),
         COALESCE(cv.last_message_at, cv.updated_at, cv.created_at, c.updated_at, c.created_at)
       )) AS latest_activity_at
     FROM contacts c
     JOIN conversations cv ON cv.contact_id = c.id AND cv.channel = 'whatsapp'
     LEFT JOIN leads l ON l.contact_id = c.id
     WHERE ${filters.join(" AND ")}
     GROUP BY c.id, c.bot_id, c.workspace_id, c.name, c.phone, c.platform_user_id, c.updated_at, c.created_at
     ORDER BY latest_activity_at DESC NULLS LAST, c.updated_at DESC NULLS LAST`,
    params
  )) as { rows: ContactCandidate[] };

  const grouped = new Map<string, ContactCandidate[]>();
  for (const candidate of candidatesRes.rows) {
    const normalizedNumber = normalizeWhatsappNumberFromCandidate(candidate);
    if (!normalizedNumber) {
      continue;
    }
    const key = `${candidate.bot_id}:${normalizedNumber}`;
    grouped.set(key, [...(grouped.get(key) || []), candidate]);
  }

  const duplicateGroups = Array.from(grouped.entries()).filter(([, group]) => group.length > 1);
  const result: WhatsAppContactRepairResult = {
    dryRun: options.dryRun === true,
    groupsScanned: grouped.size,
    duplicateGroupsFound: duplicateGroups.length,
    canonicalContactsKept: 0,
    mergedContacts: 0,
    mergedConversations: 0,
    repointedConversations: 0,
    groups: [],
  };

  if (options.dryRun || duplicateGroups.length === 0) {
    result.groups = duplicateGroups.map(([groupKey, group]) => {
      const canonical = pickCanonicalContact(group);
      return {
        normalizedNumber: groupKey.split(":").slice(1).join(":"),
        canonicalContactId: canonical.id,
        mergedContactIds: group.filter((item) => item.id !== canonical.id).map((item) => item.id),
        mergedConversationIds: [],
        repointedConversationIds: [],
      };
    });
    result.canonicalContactsKept = result.groups.length;
    result.mergedContacts = result.groups.reduce((sum, group) => sum + group.mergedContactIds.length, 0);
    return result;
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    for (const [groupKey, group] of duplicateGroups) {
      const canonical = pickCanonicalContact(group);
      const duplicates = group.filter((item) => item.id !== canonical.id);
      const normalizedNumber = groupKey.split(":").slice(1).join(":");
      const summary: DuplicateGroupSummary = {
        normalizedNumber,
        canonicalContactId: canonical.id,
        mergedContactIds: duplicates.map((item) => item.id),
        mergedConversationIds: [],
        repointedConversationIds: [],
      };

      await client.query(
        `UPDATE contacts
         SET
           phone = COALESCE(NULLIF(phone, ''), $2),
           platform_user_id = COALESCE(NULLIF(platform_user_id, ''), $2),
           updated_at = NOW()
         WHERE id = $1`,
        [canonical.id, normalizedNumber]
      );

      for (const duplicate of duplicates) {
        await client.query(
          `INSERT INTO contact_identities (contact_id, workspace_id, bot_id, platform, identity_type, identity_value, metadata)
           SELECT
             $1,
             workspace_id,
             COALESCE(bot_id, $2),
             platform,
             identity_type,
             identity_value,
             metadata
           FROM contact_identities
           WHERE contact_id = $3
           ON CONFLICT (workspace_id, platform, identity_type, identity_value)
           DO UPDATE SET
             contact_id = EXCLUDED.contact_id,
             bot_id = COALESCE(EXCLUDED.bot_id, contact_identities.bot_id),
             metadata = contact_identities.metadata || EXCLUDED.metadata,
             updated_at = NOW()`,
          [canonical.id, canonical.bot_id, duplicate.id]
        );

        await client.query(`UPDATE leads SET contact_id = $1 WHERE contact_id = $2`, [canonical.id, duplicate.id]);

        const canonicalConversations = await loadContactConversations(client, canonical.id);
        const canonicalByContext = new Map<string, ConversationRow>();
        for (const row of canonicalConversations) {
          canonicalByContext.set(conversationContextKey(row), row);
        }

        const duplicateConversations = await loadContactConversations(client, duplicate.id);
        for (const sourceConversation of duplicateConversations) {
          const targetConversation = canonicalByContext.get(conversationContextKey(sourceConversation));
          if (targetConversation) {
            await mergeConversationRecords(client, targetConversation, sourceConversation);
            summary.mergedConversationIds.push(sourceConversation.id);
            result.mergedConversations += 1;
          } else {
            await client.query(
              `UPDATE conversations
               SET
                 contact_id = $1,
                 contact_phone = COALESCE(NULLIF(contact_phone, ''), $3),
                 updated_at = NOW()
               WHERE id = $2`,
              [canonical.id, sourceConversation.id, normalizedNumber]
            );
            summary.repointedConversationIds.push(sourceConversation.id);
            result.repointedConversations += 1;
          }
        }

        await client.query(`DELETE FROM contact_identities WHERE contact_id = $1`, [duplicate.id]);
        await client.query(`DELETE FROM contacts WHERE id = $1`, [duplicate.id]);
        result.mergedContacts += 1;
      }

      result.canonicalContactsKept += 1;
      result.groups.push(summary);
    }

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
