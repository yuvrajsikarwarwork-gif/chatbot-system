export const PERMISSION_ALIASES: Record<string, string[]> = {
  create_campaign: ["create_campaign", "can_create_campaign"],
  manage_project: ["manage_project", "create_projects", "edit_projects", "delete_projects", "manage_workspace"],
  manage_integrations: ["manage_integrations", "can_manage_platform_accounts"],
  edit_bot: ["edit_bot", "edit_bots"],
  view_conversations: ["view_conversations", "view_conversation"],
  reply_conversation: ["reply_conversation", "view_conversation"],
  view_analytics: ["view_analytics", "view_workspace", "manage_workspace"],
  manage_plan: ["manage_plan", "manage_workspace"],
  support_access: ["support_access", "support_mode"],
};

export function getPermissionCandidates(permission: string) {
  return Array.from(new Set([permission, ...(PERMISSION_ALIASES[permission] || [])]));
}
