import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import SupportModeBanner from '../components/layout/SupportModeBanner';
import UiOverlay from '../components/ui/UiOverlay';
import { permissionService } from '../services/permissionService';
import { sessionService } from '../services/sessionService';
import { useAuthStore } from '../store/authStore';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const setPermissionSnapshot = useAuthStore((state) => state.setPermissionSnapshot);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);
  const memberships = useAuthStore((state) => state.memberships);
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const activeProject = useAuthStore((state) => state.activeProject);
  const resolvedAccess = useAuthStore((state) => state.resolvedAccess);
  const supportModeActive =
    Boolean(resolvedAccess?.support_access) ||
    Boolean(activeWorkspace?.permissions_json?.support_mode);
  const supportModeBlockedRoutes = [
    "/workspaces",
    "/plans",
    "/logs",
    "/system-settings",
    "/permissions",
  ];

  const getHomeRoute = () => {
    const currentUser = useAuthStore.getState().user;
    return currentUser?.role === "super_admin" || currentUser?.role === "developer"
      ? "/workspaces"
      : "/";
  };

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const token = sessionService.getToken();
    const publicPages = ['/login', '/logout', '/register', '/accept-invite', '/forgot-password', '/reset-password'];
    
    // Redirect if trying to access dashboard without token
    if (!token && !publicPages.includes(router.pathname)) {
      sessionService.clear();
      router.push('/login');
    }
    
    // Redirect if logged in and trying to access login page
    if (token && publicPages.includes(router.pathname) && router.pathname !== "/logout") {
      router.push(getHomeRoute());
    }
  }, [hasHydrated, router, router.pathname]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const token = sessionService.getToken();
    const isPlatformOperator =
      user?.role === "super_admin" || user?.role === "developer";
    const recoveryRoute = "/account-deletion";
    const workspaceScheduledForDeletion = Boolean(activeWorkspace?.workspace_deleted_at);

    if (!token || isPlatformOperator) {
      return;
    }

    if (workspaceScheduledForDeletion && router.pathname !== recoveryRoute) {
      router.replace(recoveryRoute).catch(() => undefined);
      return;
    }

    if (!workspaceScheduledForDeletion && router.pathname === recoveryRoute) {
      router.replace(getHomeRoute()).catch(() => undefined);
    }
  }, [
    activeWorkspace?.workspace_deleted_at,
    hasHydrated,
    router,
    router.pathname,
    user?.role,
  ]);

  useEffect(() => {
    if (!hasHydrated || !supportModeActive) {
      return;
    }

    if (!supportModeBlockedRoutes.includes(router.pathname)) {
      return;
    }

    const fallbackRoute = activeWorkspace?.workspace_id
      ? `/workspaces/${activeWorkspace.workspace_id}`
      : "/";
    router.replace(fallbackRoute).catch(() => undefined);
  }, [activeWorkspace?.workspace_id, hasHydrated, router, router.pathname, supportModeActive]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const token = sessionService.getToken();
    const publicPages = ['/login', '/logout', '/register', '/accept-invite', '/forgot-password', '/reset-password'];
    if (!token || publicPages.includes(router.pathname)) {
      return;
    }

    const activeWorkspaceId = activeWorkspace?.workspace_id || null;
    const activeProjectId = activeProject?.id || null;
    const needsRefresh =
      !user ||
      !resolvedAccess ||
      resolvedAccess.workspace_id !== activeWorkspaceId ||
      resolvedAccess.project_id !== activeProjectId ||
      memberships.some(
        (membership) =>
          membership.status === 'active' &&
          (!membership.effective_permissions ||
            Object.keys(membership.effective_permissions).length === 0)
      );

    if (!needsRefresh) {
      return;
    }

    permissionService
      .me()
      .then((data) => {
        const resolvedUser = data.user || user || useAuthStore.getState().user;
        if (!resolvedUser) {
          throw new Error('Unable to resolve authenticated user context');
        }

        setPermissionSnapshot({
          user: resolvedUser,
          memberships: data.memberships || [],
          activeWorkspace: data.activeWorkspace || null,
          projectAccesses: data.projectAccesses || [],
          activeProject: activeProjectId
            ? useAuthStore.getState().activeProject
            : null,
          resolvedAccess: data.resolvedAccess || null,
        });
      })
      .catch(() => {
        sessionService.clear();
        if (router.pathname !== '/login' && router.pathname !== "/logout") {
          router.push('/login');
        }
      });
  }, [
    activeProject?.id,
    activeWorkspace?.workspace_id,
    hasHydrated,
    memberships,
    resolvedAccess,
    router,
    router.pathname,
    setPermissionSnapshot,
    user,
  ]);

  if (!hasHydrated) {
    return null;
  }

  return (
    <>
      <SupportModeBanner />
      <div
        className={`bg-background text-foreground transition-colors duration-300 ${
          supportModeActive ? "pt-16" : ""
        }`}
      >
        <Component {...pageProps} />
      </div>
      <UiOverlay />
    </>
  );
}
