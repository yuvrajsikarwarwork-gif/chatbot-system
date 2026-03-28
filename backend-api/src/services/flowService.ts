import { findBotById } from "../models/botModel";
import {
  createFlow,
  deleteFlow,
  findFlowById,
  findFlowsByBot,
  findFlowSummariesByBot,
  updateFlow,
} from "../models/flowModel";
import {
  assertBotWorkspacePermission,
  getUserPlatformRole,
  WORKSPACE_PERMISSIONS,
  resolveWorkspaceMembership,
  resolveWorkspacePermissionMap,
} from "./workspaceAccessService";
import { assertProjectScopedWriteAccess } from "./projectAccessService";
import { logAuditSafe } from "./auditLogService";
import { getEffectiveWorkspaceBilling, resolveWorkspacePlanLimit } from "./billingService";
import { getAiProvidersSettingsService } from "./platformSettingsService";

// Legacy compatibility layer.
// Runtime message processing lives in flowEngine.ts.

const FLOW_NODE_TYPES = new Set([
  "start",
  "trigger",
  "msg_text",
  "msg_media",
  "send_template",
  "input",
  "menu_button",
  "menu_list",
  "knowledge_lookup",
  "condition",
  "api",
  "lead_form",
  "save",
  "reminder",
  "delay",
  "timeout",
  "error_handler",
  "assign_agent",
  "resume_bot",
  "goto",
  "end",
]);

function normalizeNodeType(type: unknown) {
  const normalized = String(type || "").trim().toLowerCase();
  if (normalized === "message") {
    return "msg_text";
  }
  return normalized;
}

function normalizeFlowJson(flowJson: any) {
  const nodes = Array.isArray(flowJson?.nodes)
    ? flowJson.nodes.map((node: any) => ({
        ...node,
        type: normalizeNodeType(node?.type),
      }))
    : [];

  return {
    ...(flowJson && typeof flowJson === "object" ? flowJson : {}),
    nodes,
    edges: Array.isArray(flowJson?.edges) ? flowJson.edges : [],
  };
}

async function validateGotoNodeConfiguration(botId: string, node: any) {
  const gotoType = String(node?.data?.gotoType || "node").trim().toLowerCase();
  if (gotoType === "node") {
    return;
  }

  if (gotoType === "flow") {
    const targetFlowId = String(node?.data?.targetFlowId || "").trim();
    if (!targetFlowId) {
      throw {
        status: 400,
        message: "Go To flow nodes require a target flow.",
      };
    }

    const targetFlow = await findFlowById(targetFlowId);
    if (!targetFlow || String(targetFlow.bot_id) !== String(botId)) {
      throw {
        status: 400,
        message: "Go To flow targets must belong to the same bot.",
      };
    }

    return;
  }

  if (gotoType === "bot") {
    const targetBotId = String(node?.data?.targetBotId || "").trim();
    if (!targetBotId) {
      throw {
        status: 400,
        message: "Go To bot nodes require a target bot.",
      };
    }

    const currentBot = await findBotById(botId);
    const targetBot = await findBotById(targetBotId);
    if (!currentBot || !targetBot) {
      throw {
        status: 400,
        message: "Go To bot target could not be found.",
      };
    }

    if (String(currentBot.workspace_id || "") !== String(targetBot.workspace_id || "")) {
      throw {
        status: 400,
        message: "Go To bot targets must stay inside the same workspace.",
      };
    }

    const targetFlowId = String(node?.data?.targetFlowId || "").trim();
    if (targetFlowId) {
      const targetFlow = await findFlowById(targetFlowId);
      if (!targetFlow || String(targetFlow.bot_id) !== String(targetBotId)) {
        throw {
          status: 400,
          message: "Selected handoff flow does not belong to the target bot.",
        };
      }
    }

    return;
  }

  throw {
    status: 400,
    message: `Unsupported Go To routing mode '${gotoType}'.`,
  };
}

async function getFlowBuilderCapabilitiesInternal(botId: string, userId: string) {
  const bot = await findBotById(botId);
  if (!bot) {
    throw { status: 404, message: "Bot not found" };
  }

  await assertBotWorkspacePermission(userId, bot.id, WORKSPACE_PERMISSIONS.viewFlows);

  const workspaceId = String(bot.workspace_id || "").trim();
  const membership = workspaceId
    ? await resolveWorkspaceMembership(userId, workspaceId)
    : null;
  const permissionMap =
    workspaceId && membership
      ? await resolveWorkspacePermissionMap(userId, workspaceId, membership.role, membership)
      : {};
  const platformRole = await getUserPlatformRole(userId);
  const hasExplicitAiPermission = Object.prototype.hasOwnProperty.call(
    permissionMap,
    WORKSPACE_PERMISSIONS.useAiNodes
  );
  const canUseAiNodesByPermission = hasExplicitAiPermission
    ? Boolean((permissionMap as Record<string, boolean>)[WORKSPACE_PERMISSIONS.useAiNodes])
    : platformRole === "developer" || platformRole === "super_admin"
      ? true
    : Boolean(
        (permissionMap as Record<string, boolean>)[WORKSPACE_PERMISSIONS.editWorkflow] ||
          (permissionMap as Record<string, boolean>)[WORKSPACE_PERMISSIONS.createFlow]
      );

  const aiProviders = await getAiProvidersSettingsService().catch(() => null);
  const aiConfigured = Boolean(
    aiProviders?.status?.openaiConfigured || aiProviders?.status?.geminiConfigured
  );
  const billing = workspaceId ? await getEffectiveWorkspaceBilling(workspaceId).catch(() => null) : null;
  const aiReplyLimit = billing
    ? resolveWorkspacePlanLimit(
        billing.workspace,
        billing.plan,
        billing.subscription,
        "ai_reply_limit",
        null
      )
    : null;

  const disabledReasons: Record<string, string> = {};
  const allowedNodeTypes = new Set(FLOW_NODE_TYPES);

  if (!canUseAiNodesByPermission) {
    allowedNodeTypes.delete("knowledge_lookup");
    disabledReasons.knowledge_lookup = "AI node permission is disabled for this workspace role";
  } else if (!aiConfigured) {
    allowedNodeTypes.delete("knowledge_lookup");
    disabledReasons.knowledge_lookup = "AI provider settings are not configured yet";
  } else if (aiReplyLimit !== null && Number(aiReplyLimit) <= 0) {
    allowedNodeTypes.delete("knowledge_lookup");
    disabledReasons.knowledge_lookup = "This workspace plan does not include AI reply usage";
  }

  return {
    botId,
    workspaceId: workspaceId || null,
    allowedNodeTypes: [...allowedNodeTypes],
    disabledReasons,
    flags: {
      aiConfigured,
      canUseAiNodesByPermission,
      aiReplyLimit,
    },
  };
}

async function validateFlowJsonAgainstCapabilities(
  flowJson: any,
  botId: string,
  capabilities: { allowedNodeTypes: string[]; disabledReasons: Record<string, string> }
) {
  const normalized = normalizeFlowJson(flowJson);
  const allowedNodeTypes = new Set(capabilities.allowedNodeTypes);

  for (const node of normalized.nodes) {
    const type = normalizeNodeType(node?.type);
    if (!FLOW_NODE_TYPES.has(type)) {
      throw { status: 400, message: `Unsupported workflow node type '${type || "unknown"}'.` };
    }
    if (type === "goto") {
      await validateGotoNodeConfiguration(botId, node);
    }
    if (!allowedNodeTypes.has(type)) {
      throw {
        status: 403,
        message:
          capabilities.disabledReasons[type] ||
          `Workflow node '${type}' is not available for this workspace.`,
      };
    }
  }

  return normalized;
}

export async function getFlowBuilderCapabilitiesService(botId: string, userId: string) {
  return getFlowBuilderCapabilitiesInternal(botId, userId);
}

export async function getFlowsByBotService(botId: string, userId: string) {
  const bot = await assertBotWorkspacePermission(
    userId,
    botId,
    WORKSPACE_PERMISSIONS.viewFlows
  );

  return findFlowsByBot(botId);
}

export async function getFlowSummariesByBotService(botId: string, userId: string) {
  const bot = await assertBotWorkspacePermission(
    userId,
    botId,
    WORKSPACE_PERMISSIONS.viewFlows
  );

  return findFlowSummariesByBot(botId);
}

export async function getFlowService(id: string, userId: string) {
  const flow = await findFlowById(id);
  if (!flow) {
    throw { status: 404, message: "Flow not found" };
  }

  const bot = await findBotById(flow.bot_id);
  if (!bot) {
    throw { status: 404, message: "Flow not found" };
  }
  await assertBotWorkspacePermission(userId, bot.id, WORKSPACE_PERMISSIONS.viewFlows);

  return flow;
}

export async function saveFlowService(
  botId: string,
  userId: string,
  flowJson: any,
  flowId?: string,
  flowName?: string
) {
  const capabilities = await getFlowBuilderCapabilitiesInternal(botId, userId);
  const normalizedFlowJson = await validateFlowJsonAgainstCapabilities(flowJson, botId, capabilities);
  const bot = await assertBotWorkspacePermission(
    userId,
    botId,
    WORKSPACE_PERMISSIONS.editWorkflow
  );
  await assertProjectScopedWriteAccess({
    userId,
    projectId: String(bot.project_id || ""),
    workspaceId: bot.workspace_id,
    workspacePermission: WORKSPACE_PERMISSIONS.editWorkflow,
    allowedProjectRoles: ["project_admin", "editor"],
  });

  if (flowId) {
    const existing = await findFlowById(flowId);
    if (!existing || existing.bot_id !== botId) {
      throw { status: 404, message: "Flow not found" };
    }

    const updated = await updateFlow(flowId, botId, normalizedFlowJson, flowName);
    await logAuditSafe({
      userId,
      workspaceId: bot.workspace_id,
      projectId: bot.project_id,
      action: "update",
      entity: "flow",
      entityId: flowId,
      oldData: existing as unknown as Record<string, unknown>,
      newData: updated as unknown as Record<string, unknown>,
    });
    return updated;
  }

  const existingFlows = await findFlowsByBot(botId);
  const defaultFlow = existingFlows.find((flow) => flow.is_default) || existingFlows[0];

  if (defaultFlow) {
    const updated = await updateFlow(defaultFlow.id, botId, normalizedFlowJson, flowName);
    await logAuditSafe({
      userId,
      workspaceId: bot.workspace_id,
      projectId: bot.project_id,
      action: "update",
      entity: "flow",
      entityId: defaultFlow.id,
      oldData: defaultFlow as unknown as Record<string, unknown>,
      newData: updated as unknown as Record<string, unknown>,
    });
    return updated;
  }

  const created = await createFlow(botId, normalizedFlowJson, flowName, true);
  await logAuditSafe({
    userId,
    workspaceId: bot.workspace_id,
    projectId: bot.project_id,
    action: "create",
    entity: "flow",
    entityId: created.id,
    newData: created as unknown as Record<string, unknown>,
  });
  return created;
}

export async function createNewFlowService(
  botId: string,
  userId: string,
  flowJson: any,
  flowName?: string,
  isDefault = false
) {
  const capabilities = await getFlowBuilderCapabilitiesInternal(botId, userId);
  const normalizedFlowJson = await validateFlowJsonAgainstCapabilities(flowJson, botId, capabilities);
  const bot = await assertBotWorkspacePermission(
    userId,
    botId,
    WORKSPACE_PERMISSIONS.createFlow
  );
  await assertProjectScopedWriteAccess({
    userId,
    projectId: String(bot.project_id || ""),
    workspaceId: bot.workspace_id,
    workspacePermission: WORKSPACE_PERMISSIONS.createFlow,
    allowedProjectRoles: ["project_admin", "editor"],
  });

  const created = await createFlow(botId, normalizedFlowJson, flowName, isDefault);
  await logAuditSafe({
    userId,
    workspaceId: bot.workspace_id,
    projectId: bot.project_id,
    action: "create",
    entity: "flow",
    entityId: created.id,
    newData: created as unknown as Record<string, unknown>,
  });
  return created;
}

export async function updateFlowService(
  id: string,
  userId: string,
  flowJson: any,
  flowName?: string,
  isDefault?: boolean
) {
  const flow = await findFlowById(id);
  if (!flow) {
    throw { status: 404, message: "Flow not found" };
  }

  const capabilities = await getFlowBuilderCapabilitiesInternal(flow.bot_id, userId);
  const normalizedFlowJson = await validateFlowJsonAgainstCapabilities(flowJson, flow.bot_id, capabilities);

  const bot = await findBotById(flow.bot_id);
  if (!bot) {
    throw { status: 404, message: "Flow not found" };
  }
  await assertBotWorkspacePermission(userId, bot.id, WORKSPACE_PERMISSIONS.editWorkflow);
  await assertProjectScopedWriteAccess({
    userId,
    projectId: String(bot.project_id || ""),
    workspaceId: bot.workspace_id,
    workspacePermission: WORKSPACE_PERMISSIONS.editWorkflow,
    allowedProjectRoles: ["project_admin", "editor"],
  });

  const updated = await updateFlow(id, bot.id, normalizedFlowJson, flowName, isDefault);
  await logAuditSafe({
    userId,
    workspaceId: bot.workspace_id,
    projectId: bot.project_id,
    action: "update",
    entity: "flow",
    entityId: id,
    oldData: flow as unknown as Record<string, unknown>,
    newData: updated as unknown as Record<string, unknown>,
  });
  return updated;
}

export async function deleteFlowService(id: string, userId: string) {
  const flow = await findFlowById(id);
  if (!flow) {
    throw { status: 404, message: "Flow not found" };
  }

  const bot = await findBotById(flow.bot_id);
  if (!bot) {
    throw { status: 404, message: "Flow not found" };
  }
  await assertBotWorkspacePermission(userId, bot.id, WORKSPACE_PERMISSIONS.deleteFlow);
  await assertProjectScopedWriteAccess({
    userId,
    projectId: String(bot.project_id || ""),
    workspaceId: bot.workspace_id,
    workspacePermission: WORKSPACE_PERMISSIONS.deleteFlow,
    allowedProjectRoles: ["project_admin"],
  });

  await logAuditSafe({
    userId,
    workspaceId: bot.workspace_id,
    projectId: bot.project_id,
    action: "delete",
    entity: "flow",
    entityId: id,
    oldData: flow as unknown as Record<string, unknown>,
  });
  await deleteFlow(id, bot.id);
}
