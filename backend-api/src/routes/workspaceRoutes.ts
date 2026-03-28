import { Router } from "express";

import { authMiddleware } from "../middleware/authMiddleware";
import {
  requireAuthenticatedUser,
  requirePlatformRoles,
  requireWorkspaceAccess,
  requireWorkspacePermission,
  requireWorkspacePermissionAny,
  resolveWorkspaceContext,
} from "../middleware/policyMiddleware";
import {
  approveWorkspaceSupportRequestCtrl,
  archiveWorkspaceCtrl,
  assignWorkspaceUserCtrl,
  createWorkspaceExportRequestCtrl,
  createWorkspaceSupportRequestCtrl,
  createWorkspaceCtrl,
  deleteWorkspaceCtrl,
  downloadWorkspaceExportForUserCtrl,
  denyWorkspaceSupportRequestCtrl,
  emergencyResetWorkspaceOwnerPasswordCtrl,
  getWorkspaceBillingContextCtrl,
  getWorkspaceCtrl,
  getWorkspaceOverviewCtrl,
  getWorkspaceWalletCtrl,
  createWorkspaceWalletAdjustmentCtrl,
  ingestWorkspaceKnowledgeCtrl,
  grantWorkspaceSupportAccessCtrl,
  lockWorkspaceCtrl,
  listWorkspaceMembersCtrl,
  listWorkspaceExportRequestsCtrl,
  listWorkspaceSupportAccessCtrl,
  listWorkspaceSupportRequestsCtrl,
  listWorkspacesCtrl,
  removeWorkspaceUserCtrl,
  repairWorkspaceWhatsAppContactsCtrl,
  restoreWorkspaceCtrl,
  selfRestoreWorkspaceCtrl,
  revokeWorkspaceSupportAccessCtrl,
  searchWorkspaceKnowledgeCtrl,
  unlockWorkspaceCtrl,
  updateWorkspaceBillingCtrl,
  updateWorkspaceCtrl,
} from "../controllers/workspaceController";
import { WORKSPACE_PERMISSIONS } from "../services/workspaceAccessService";

const router = Router();

router.use(authMiddleware);
router.use(requireAuthenticatedUser);

router.get("/", listWorkspacesCtrl);
router.post("/", requirePlatformRoles(["super_admin", "developer"]), createWorkspaceCtrl);
router.get(
  "/:id/members-access",
  resolveWorkspaceContext,
  requireWorkspacePermissionAny([
    WORKSPACE_PERMISSIONS.manageUsers,
    WORKSPACE_PERMISSIONS.managePermissions,
  ]),
  listWorkspaceMembersCtrl
);
router.post(
  "/:id/members-access",
  resolveWorkspaceContext,
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.manageUsers),
  assignWorkspaceUserCtrl
);
router.delete(
  "/:id/members-access/:userId",
  resolveWorkspaceContext,
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.manageUsers),
  removeWorkspaceUserCtrl
);
router.delete(
  "/:id",
  requirePlatformRoles(["super_admin", "developer"]),
  deleteWorkspaceCtrl
);
router.post(
  "/:id/archive",
  requirePlatformRoles(["super_admin", "developer"]),
  archiveWorkspaceCtrl
);
router.post(
  "/:id/restore",
  requirePlatformRoles(["super_admin", "developer"]),
  restoreWorkspaceCtrl
);
router.post("/:id/self-restore", selfRestoreWorkspaceCtrl);
router.put(
  "/:id",
  requirePlatformRoles(["super_admin", "developer"]),
  updateWorkspaceCtrl
);
router.put(
  "/:id/billing",
  requirePlatformRoles(["super_admin", "developer"]),
  updateWorkspaceBillingCtrl
);
router.post(
  "/:id/lock",
  requirePlatformRoles(["super_admin", "developer"]),
  lockWorkspaceCtrl
);
router.post(
  "/:id/unlock",
  requirePlatformRoles(["super_admin", "developer"]),
  unlockWorkspaceCtrl
);
router.get(
  "/:id/members",
  resolveWorkspaceContext,
  requireWorkspacePermissionAny([
    WORKSPACE_PERMISSIONS.manageUsers,
    WORKSPACE_PERMISSIONS.managePermissions,
  ]),
  listWorkspaceMembersCtrl
);
router.post(
  "/:id/members/emergency-owner-reset",
  requirePlatformRoles(["super_admin", "developer"]),
  emergencyResetWorkspaceOwnerPasswordCtrl
);
router.get("/:id/export-requests", listWorkspaceExportRequestsCtrl);
router.post("/:id/export-requests", createWorkspaceExportRequestCtrl);
router.get("/:id/export-requests/:jobId/download", downloadWorkspaceExportForUserCtrl);
router.post(
  "/:id/members",
  resolveWorkspaceContext,
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.manageUsers),
  assignWorkspaceUserCtrl
);
router.delete(
  "/:id/members/:userId",
  resolveWorkspaceContext,
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.manageUsers),
  removeWorkspaceUserCtrl
);
router.post(
  "/:id/users",
  resolveWorkspaceContext,
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.manageUsers),
  assignWorkspaceUserCtrl
);
router.get(
  "/:id/support-access",
  resolveWorkspaceContext,
  requireWorkspaceAccess,
  listWorkspaceSupportAccessCtrl
);
router.post(
  "/:id/support-access",
  requirePlatformRoles(["super_admin", "developer"]),
  grantWorkspaceSupportAccessCtrl
);
router.delete(
  "/:id/support-access/:userId",
  requirePlatformRoles(["super_admin", "developer"]),
  revokeWorkspaceSupportAccessCtrl
);
router.get("/:id/support-requests", resolveWorkspaceContext, requireWorkspaceAccess, listWorkspaceSupportRequestsCtrl);
router.get("/:id/overview", resolveWorkspaceContext, requireWorkspaceAccess, getWorkspaceOverviewCtrl);
router.get("/:id/wallet", resolveWorkspaceContext, requireWorkspaceAccess, getWorkspaceWalletCtrl);
router.get("/:id/billing-context", requirePlatformRoles(["super_admin", "developer"]), getWorkspaceBillingContextCtrl);
router.post(
  "/:id/wallet",
  requirePlatformRoles(["super_admin", "developer"]),
  createWorkspaceWalletAdjustmentCtrl
);
router.get("/:id/knowledge/search", resolveWorkspaceContext, requireWorkspaceAccess, searchWorkspaceKnowledgeCtrl);
router.post(
  "/:id/knowledge/documents",
  resolveWorkspaceContext,
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.manageWorkspace),
  ingestWorkspaceKnowledgeCtrl
);
router.post(
  "/:id/repair/whatsapp-contacts",
  resolveWorkspaceContext,
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.manageWorkspace),
  repairWorkspaceWhatsAppContactsCtrl
);
router.post(
  "/:id/support-requests",
  resolveWorkspaceContext,
  requireWorkspaceAccess,
  createWorkspaceSupportRequestCtrl
);
router.post(
  "/:id/support-requests/:requestId/approve",
  requirePlatformRoles(["super_admin", "developer"]),
  approveWorkspaceSupportRequestCtrl
);
router.post(
  "/:id/support-requests/:requestId/deny",
  requirePlatformRoles(["super_admin", "developer"]),
  denyWorkspaceSupportRequestCtrl
);
router.get("/:id", resolveWorkspaceContext, requireWorkspaceAccess, getWorkspaceCtrl);

export default router;
