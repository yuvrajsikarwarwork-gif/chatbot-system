import { useMemo } from "react";

import { useAuthStore } from "../store/authStore";
import { getPermissionCandidates } from "../utils/permissionAliases";

export type AppSection =
  | "dashboard"
  | "analytics"
  | "projects"
  | "campaigns"
  | "bots"
  | "flows"
  | "integrations"
  | "conversations"
  | "inbox"
  | "leads"
  | "templates"
  | "audit"
  | "permissions"
  | "users_access"
  | "workspaces"
  | "users"
  | "settings"
  | "tickets"
  | "support"
  | "billing"
  | "plans"
  | "logs"
  | "system_settings";

export function useVisibility() {
  const user = useAuthStore((state) => state.user);
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const activeProject = useAuthStore((state) => state.activeProject);
  const resolvedAccess = useAuthStore((state) => state.resolvedAccess);
  const hasWorkspacePermission = useAuthStore((state) => state.hasWorkspacePermission);

  return useMemo(() => {
    const workspaceId = activeWorkspace?.workspace_id || null;
    const workspaceRole = resolvedAccess?.workspace_role || activeWorkspace?.role || null;
    const supportAccess = Boolean(resolvedAccess?.support_access);
    const isPlatformOperator =
      !supportAccess &&
      (Boolean(resolvedAccess?.is_platform_operator) ||
        user?.role === "super_admin" ||
        user?.role === "developer");

    const workspacePermissions =
      resolvedAccess?.workspace_permissions ||
      activeWorkspace?.effective_permissions ||
      {};

    const readSection = (section: AppSection, key: "nav" | "page") =>
      Boolean(resolvedAccess?.sections?.[section]?.[key]);

    const canSeeNav = (section: AppSection) => readSection(section, "nav");
    const canViewPage = (section: AppSection) => readSection(section, "page");
    const hasResolvedPermission = (permission: string) =>
      getPermissionCandidates(permission).some((candidate) =>
        Boolean(workspacePermissions?.[candidate]) ||
        hasWorkspacePermission(workspaceId, candidate)
      );

    return {
      workspaceId,
      workspaceRole,
      isWorkspaceAdmin: workspaceRole === "workspace_admin",
      isPlatformOperator,
      canManageWorkspace: hasResolvedPermission("manage_workspace"),
      canManageUsers: hasResolvedPermission("manage_users"),
      canManagePermissions: hasResolvedPermission("manage_permissions"),
      canManageIntegrations: hasResolvedPermission("manage_integrations"),
      canManageProject: hasResolvedPermission("manage_project"),
      canViewProjects: canViewPage("projects"),
      canViewCampaigns: canViewPage("campaigns"),
      canViewBots: canViewPage("bots"),
      canViewFlows: canViewPage("flows"),
      canViewConversations: canViewPage("inbox"),
      canReplyConversations: hasResolvedPermission("reply_conversation"),
      canViewLeads: canViewPage("leads"),
      canViewAnalytics: canViewPage("analytics"),
      canViewSupport: canViewPage("support") || canViewPage("tickets"),
      canViewUsersAccess: canViewPage("users_access"),
      canViewBilling: canViewPage("billing"),
      activeProjectRole: resolvedAccess?.project_role || null,
      activeProjectId: resolvedAccess?.project_id || activeProject?.id || null,
      supportAccess,
      agentScope:
        resolvedAccess?.agent_scope || {
          projectIds: [],
          campaignIds: [],
          platforms: [],
          channelIds: [],
        },
      canSeeNav,
      canViewPage,
    };
  }, [
    activeProject?.id,
    activeWorkspace?.effective_permissions,
    activeWorkspace?.role,
    activeWorkspace?.workspace_id,
    hasWorkspacePermission,
    resolvedAccess,
    user?.role,
  ]);
}
