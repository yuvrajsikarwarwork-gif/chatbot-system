import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Archive, Bot, Briefcase, CreditCard, Layers3, LifeBuoy, MessageSquareMore, PlugZap, Trash2, Users } from "lucide-react";

import PageAccessNotice from "../../../components/access/PageAccessNotice";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import WorkspaceConsoleTabs from "../../../components/workspace/WorkspaceConsoleTabs";
import WorkspaceStatusBanner from "../../../components/workspace/WorkspaceStatusBanner";
import { useVisibility } from "../../../hooks/useVisibility";
import { authService } from "../../../services/authService";
import { workspaceService, type WorkspaceOverview } from "../../../services/workspaceService";
import { useAuthStore } from "../../../store/authStore";
import { confirmAction, notify } from "../../../store/uiStore";

function formatCurrency(value: number | null | undefined, currency = "INR") {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatLimitUsage(value: number, limit: number | null) {
  if (!limit || limit <= 0) {
    return {
      label: `${value} used`,
      percent: 0,
    };
  }

  return {
    label: `${value}/${limit}`,
    percent: Math.min(100, Math.round((value / limit) * 100)),
  };
}

export default function WorkspaceOverviewPage() {
  const router = useRouter();
  const { workspaceId } = router.query;
  const {
    canViewPage,
    canViewBilling,
    isPlatformOperator,
  } = useVisibility();
  const user = useAuthStore((state) => state.user);
  const memberships = useAuthStore((state) => state.memberships);
  const projectAccesses = useAuthStore((state) => state.projectAccesses);
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const hasWorkspacePermission = useAuthStore((state) => state.hasWorkspacePermission);
  const setPermissionSnapshot = useAuthStore((state) => state.setPermissionSnapshot);
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizedWorkspaceId = String(workspaceId || "").trim();
  const canViewWorkspaceOverview =
    canViewPage("workspaces") ||
    isPlatformOperator ||
    (activeWorkspace?.workspace_id === normalizedWorkspaceId &&
      hasWorkspacePermission(normalizedWorkspaceId, "view_workspace"));
  const canOpenBilling = canViewBilling;

  useEffect(() => {
    if (!normalizedWorkspaceId || !canViewWorkspaceOverview) {
      setOverview(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await workspaceService.getOverview(normalizedWorkspaceId);
        if (!cancelled) {
          setOverview(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setOverview(null);
          setError(err?.response?.data?.error || "Failed to load workspace overview.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [normalizedWorkspaceId, canViewWorkspaceOverview]);

  const handleArchiveWorkspace = async () => {
    if (!workspace) {
      return;
    }

    const confirmed = await confirmAction(
      "Archive workspace",
      `Archive ${workspace.name}? This keeps the record for recovery and audit, but blocks normal tenant access until a platform operator reactivates it.`,
      "Archive"
    );

    if (!confirmed) {
      return;
    }

    try {
      const updated = await workspaceService.archive(workspace.id);
      setOverview((current) =>
        current
          ? {
              ...current,
              workspace: {
                ...current.workspace,
                ...updated,
              },
            }
          : current
      );
      notify("Workspace archived.", "success");
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to archive workspace.";
      setError(message);
      notify(message, "error");
    }
  };

  const workspace = overview?.workspace || null;
  const metrics = overview?.metrics;
  const wallet = overview?.wallet;
  const holdActionLabel =
    workspace?.status === "archived"
      ? "Restore Workspace"
      : workspace?.status === "suspended"
        ? "Reactivate Workspace"
        : "Place Account Hold";
  const usageCards = useMemo(() => {
    if (!overview) {
      return [];
    }

    return [
      { label: "Users", value: overview.metrics.members, limit: overview.limits.users, icon: Users },
      { label: "Projects", value: overview.metrics.projects, limit: overview.limits.projects, icon: Briefcase },
      { label: "Campaigns", value: overview.metrics.campaigns, limit: overview.limits.campaigns, icon: Layers3 },
      { label: "Integrations", value: overview.metrics.integrations, limit: overview.limits.integrations, icon: PlugZap },
      { label: "Bots", value: overview.metrics.bots, limit: overview.limits.bots, icon: Bot },
    ];
  }, [overview]);

  const handleDeleteWorkspace = async () => {
    if (!workspace) {
      return;
    }

    if (
      !(await confirmAction(
        "Schedule workspace deletion",
        `This will soft-delete ${workspace.name}, hide tenant data from normal views, and schedule permanent purge after 30 days.`,
        "Schedule deletion"
      ))
    ) {
      return;
    }

    try {
      const updated = await workspaceService.delete(workspace.id);
      setOverview((current) =>
        current
          ? {
              ...current,
              workspace: {
                ...current.workspace,
                ...updated,
              },
            }
          : current
      );
      notify("Workspace scheduled for deletion.", "success");
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to delete workspace.";
      setError(message);
      notify(message, "error");
    }
  };

  const handleWorkspaceHoldToggle = async () => {
    if (!workspace) {
      return;
    }

    const nextStatus =
      workspace.status === "archived"
        ? "active"
        : workspace.status === "suspended"
          ? "active"
          : "suspended";
    const confirmed = await confirmAction(
      nextStatus === "suspended" ? "Place account hold" : "Reactivate workspace",
      nextStatus === "suspended"
        ? `This will suspend ${workspace.name} and stop normal tenant access until it is reactivated.`
        : `This will restore ${workspace.name} to active status.`,
      nextStatus === "suspended" ? "Place hold" : "Reactivate"
    );

    if (!confirmed) {
      return;
    }

    try {
      const updated =
        workspace.deleted_at && nextStatus === "active"
          ? await workspaceService.restore(workspace.id)
          : await workspaceService.update(workspace.id, { status: nextStatus });
      setOverview((current) =>
        current
          ? {
              ...current,
              workspace: {
                ...current.workspace,
                ...updated,
              },
            }
          : current
      );
      notify(
        nextStatus === "suspended"
          ? "Workspace placed on hold."
          : workspace.deleted_at
            ? "Workspace restored."
            : "Workspace reactivated.",
        "success"
      );
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to update workspace status.";
      setError(message);
      notify(message, "error");
    }
  };

  const handleSupportLogin = async () => {
    if (!workspace) {
      return;
    }

    const confirmed = await confirmAction(
      "Confirm support consent",
      `Confirm the client has explicitly approved temporary support entry for ${workspace.name} before continuing.`,
      "Enter workspace"
    );

    if (!confirmed) {
      return;
    }

    try {
      const session = await authService.startSupportSession({
        workspaceId: workspace.id,
        consentConfirmed: true,
        consentNote: "Confirmed from workspace overview support entry",
      });
      setPermissionSnapshot({
        user: session.user || user,
        memberships,
        activeWorkspace: session.activeWorkspace,
        projectAccesses,
        activeProject: null,
        resolvedAccess: session.resolvedAccess,
      });
      notify("Support session started.", "success");
      router.replace(`/workspaces/${workspace.id}`).catch(() => undefined);
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to start support session.";
      setError(message);
      notify(message, "error");
    }
  };

  return (
    <DashboardLayout>
      {!canViewWorkspaceOverview ? (
        <PageAccessNotice
          title="Workspace overview is restricted for this role"
          description="Workspace overview is available to platform operators and workspace members with view access."
          href="/"
          ctaLabel="Open dashboard"
        />
      ) : loading ? (
        <div className="mx-auto max-w-7xl">
          <section className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--surface)] px-5 py-8 text-sm text-[var(--muted)]">
            Loading workspace overview...
          </section>
        </div>
      ) : error || !workspace || !metrics || !wallet ? (
        <div className="mx-auto max-w-7xl">
          <section className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-8 text-sm text-rose-700">
            {error || "Workspace overview could not be loaded."}
          </section>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl space-y-6">
          <WorkspaceStatusBanner workspace={workspace} />
          <WorkspaceConsoleTabs workspaceId={workspace.id} activeSlug="" />

          <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Workspace Overview
                </div>
                <h1 className="mt-3 text-[1.7rem] font-semibold tracking-tight text-[var(--text)]">
                  {workspace.name}
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Tenant health, usage rate, and quick admin actions for this workspace.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {canOpenBilling ? (
                  <Link
                    href={`/workspaces/${workspace.id}/billing`}
                    className="rounded-[1.05rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)] transition duration-200 hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)]"
                  >
                    Billing & Wallet
                  </Link>
                ) : null}
                <Link
                  href="/workspaces"
                  className="rounded-[1.05rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)] transition duration-200 hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)]"
                >
                  Back to Workspaces
                </Link>
                {isPlatformOperator ? (
                  <button
                    type="button"
                    onClick={handleWorkspaceHoldToggle}
                    className="rounded-[1.05rem] border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800 transition duration-200 hover:bg-amber-100"
                  >
                    {holdActionLabel}
                  </button>
                ) : null}
                {isPlatformOperator ? (
                  <button
                    type="button"
                    onClick={handleArchiveWorkspace}
                    className="rounded-[1.05rem] border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition duration-200 hover:bg-slate-100"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Archive size={14} />
                      Archive Workspace
                    </span>
                  </button>
                ) : null}
                {isPlatformOperator ? (
                  <button
                    type="button"
                    onClick={handleSupportLogin}
                    className="rounded-[1.05rem] border border-sky-200 bg-sky-50 px-4 py-3 text-left text-sm text-sky-800 transition duration-200 hover:bg-sky-100"
                  >
                    Login as Workspace
                  </button>
                ) : null}
                {isPlatformOperator ? (
                  <button
                    type="button"
                    onClick={handleDeleteWorkspace}
                    className="rounded-[1.05rem] border border-rose-300/35 bg-rose-500/10 px-4 py-3 text-left text-sm text-rose-200 transition duration-200 hover:bg-rose-500/20"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Trash2 size={14} />
                      Delete Workspace
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Open Conversations", value: metrics.openConversations, helper: `${metrics.conversations} total`, icon: MessageSquareMore },
              { label: "Leads", value: metrics.leads, helper: `${metrics.campaigns} campaigns`, icon: Activity },
              ...(canOpenBilling
                ? [{ label: "Wallet Balance", value: formatCurrency(wallet.balance, workspace.currency || "INR"), helper: wallet.enabled ? "Wallet enabled" : "Wallet inactive", icon: CreditCard }]
                : []),
              ...(canOpenBilling
                ? [{
                    label: "Support Ops",
                    value: overview.support.openRequests,
                    helper: `${overview.support.totalRequests} requests, ${overview.support.activeAccess} active grants`,
                    icon: LifeBuoy,
                  }]
                : []),
            ].map((card) => {
              const Icon = card.icon;
              return (
                <section
                  key={card.label}
                  className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                      {card.label}
                    </div>
                    <div className="rounded-xl bg-[var(--surface-strong)] p-2 text-[var(--muted)]">
                      <Icon size={16} />
                    </div>
                  </div>
                  <div className="mt-4 text-2xl font-semibold tracking-tight text-[var(--text)]">{card.value}</div>
                  <div className="mt-2 text-sm text-[var(--muted)]">{card.helper}</div>
                </section>
              );
            })}
          </div>

          <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)]">
            <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Usage Rate
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {usageCards.map((card) => {
                const usage = formatLimitUsage(card.value, card.limit);
                const Icon = card.icon;
                return (
                  <section
                    key={card.label}
                    className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-[var(--text)]">{card.label}</div>
                      <Icon size={16} className="text-[var(--muted)]" />
                    </div>
                    <div className="mt-3 text-sm text-[var(--muted)]">{usage.label}</div>
                    <div className="mt-3 h-2 rounded-full bg-[var(--surface-muted)]">
                      <div
                        className="h-2 rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))]"
                        style={{ width: `${usage.percent}%` }}
                      />
                    </div>
                  </section>
                );
              })}
            </div>
          </section>

          <section className={`grid gap-4 ${canOpenBilling ? "lg:grid-cols-2" : ""}`}>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Subscription
              </div>
              <div className="mt-4 space-y-3 text-sm text-[var(--text)]">
                <div>Plan: {workspace.subscription_plan_name || workspace.plan_id || "starter"}</div>
                <div>Status: {workspace.subscription_status || "unknown"}</div>
                <div>Workspace: {workspace.status}</div>
                <div>Expiry: {workspace.expiry_date ? new Date(workspace.expiry_date).toLocaleDateString() : "n/a"}</div>
                <div>Grace End: {workspace.grace_period_end ? new Date(workspace.grace_period_end).toLocaleDateString() : "n/a"}</div>
              </div>
            </div>

            {canOpenBilling ? (
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Recent Wallet Activity
                </div>
                <div className="mt-4 space-y-3">
                  {wallet.recentTransactions.length ? (
                    wallet.recentTransactions.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-[var(--text)]">{row.transaction_type}</div>
                          <div className="text-sm text-[var(--text)]">{formatCurrency(row.amount, workspace.currency || "INR")}</div>
                        </div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {row.created_at ? new Date(row.created_at).toLocaleString() : "Unknown time"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--surface-strong)] px-4 py-6 text-sm text-[var(--muted)]">
                      No wallet transactions recorded yet.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
