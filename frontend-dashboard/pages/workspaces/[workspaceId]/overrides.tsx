import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import PageAccessNotice from "../../../components/access/PageAccessNotice";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import WorkspaceConsoleTabs from "../../../components/workspace/WorkspaceConsoleTabs";
import WorkspaceStatusBanner from "../../../components/workspace/WorkspaceStatusBanner";
import { useVisibility } from "../../../hooks/useVisibility";
import { workspaceService, type WorkspaceOverview } from "../../../services/workspaceService";
import { notify } from "../../../store/uiStore";

type OverrideForm = {
  agentSeatLimitOverride: string;
  projectLimitOverride: string;
  activeBotLimitOverride: string;
  monthlyCampaignLimitOverride: string;
  maxNumbersOverride: string;
  aiReplyLimitOverride: string;
};

function toInputValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function buildOverrideForm(overview: WorkspaceOverview): OverrideForm {
  const workspace = overview.workspace;
  return {
    agentSeatLimitOverride: toInputValue(workspace.agent_seat_limit_override),
    projectLimitOverride: toInputValue(workspace.project_limit_override),
    activeBotLimitOverride: toInputValue(workspace.active_bot_limit_override),
    monthlyCampaignLimitOverride: toInputValue(workspace.monthly_campaign_limit_override),
    maxNumbersOverride: toInputValue(workspace.max_numbers_override),
    aiReplyLimitOverride: toInputValue(workspace.ai_reply_limit_override),
  };
}

export default function WorkspaceOverridesPage() {
  const router = useRouter();
  const { workspaceId } = router.query;
  const { canViewBilling } = useVisibility();
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [form, setForm] = useState<OverrideForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canViewOverridesPage = canViewBilling;
  const normalizedWorkspaceId = String(workspaceId || "").trim();

  const load = async () => {
    if (!normalizedWorkspaceId) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await workspaceService.getOverview(normalizedWorkspaceId);
      setOverview(data);
      setForm(buildOverrideForm(data));
    } catch (err: any) {
      setOverview(null);
      setForm(null);
      setError(err?.response?.data?.error || "Failed to load limits and overrides.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!normalizedWorkspaceId || !canViewOverridesPage) {
      setOverview(null);
      setForm(null);
      return;
    }

    load().catch(console.error);
  }, [normalizedWorkspaceId, canViewOverridesPage]);

  const workspace = overview?.workspace || null;

  const cards = useMemo(() => {
    if (!overview || !workspace) {
      return [];
    }

    return [
      {
        label: "Users / Seats",
        effective: overview.limits.users ?? "Unlimited",
        override: workspace.agent_seat_limit_override,
        formKey: "agentSeatLimitOverride" as const,
        helper: "Overrides seat-based user allowance for this specific workspace.",
      },
      {
        label: "Projects",
        effective: overview.limits.projects ?? "Unlimited",
        override: workspace.project_limit_override,
        formKey: "projectLimitOverride" as const,
        helper: "Lets this client create more or fewer projects than the base plan.",
      },
      {
        label: "Active Bots",
        effective: overview.limits.bots ?? "Unlimited",
        override: workspace.active_bot_limit_override,
        formKey: "activeBotLimitOverride" as const,
        helper: "Controls the active bot cap without moving the workspace to another plan.",
      },
      {
        label: "Monthly Campaign Runs",
        effective: overview.limits.campaigns ?? "Unlimited",
        override: workspace.monthly_campaign_limit_override,
        formKey: "monthlyCampaignLimitOverride" as const,
        helper: "Applies to campaign execution checks for this workspace.",
      },
      {
        label: "Integrations / Numbers",
        effective: overview.limits.integrations ?? "Unlimited",
        override: workspace.max_numbers_override,
        formKey: "maxNumbersOverride" as const,
        helper: "Overrides connected platform account capacity for this client.",
      },
      {
        label: "AI Replies",
        effective:
          workspace.ai_reply_limit_override ??
          workspace.ai_reply_limit ??
          "Unlimited",
        override: workspace.ai_reply_limit_override,
        formKey: "aiReplyLimitOverride" as const,
        helper: "Controls included AI reply volume before overage handling kicks in.",
      },
    ];
  }, [overview, workspace]);

  const handleSave = async () => {
    if (!normalizedWorkspaceId || !form) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      await workspaceService.update(normalizedWorkspaceId, {
        agentSeatLimitOverride: form.agentSeatLimitOverride || null,
        projectLimitOverride: form.projectLimitOverride || null,
        activeBotLimitOverride: form.activeBotLimitOverride || null,
        monthlyCampaignLimitOverride: form.monthlyCampaignLimitOverride || null,
        maxNumbersOverride: form.maxNumbersOverride || null,
        aiReplyLimitOverride: form.aiReplyLimitOverride || null,
      });
      notify("Workspace overrides updated.", "success");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save workspace overrides.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!overview) {
      return;
    }
    setForm(buildOverrideForm(overview));
  };

  return (
    <DashboardLayout>
      {!canViewOverridesPage ? (
        <PageAccessNotice
          title="Workspace overrides are restricted for this role"
          description="Custom limit controls are only available to platform billing and operations users."
          href="/workspaces"
          ctaLabel="Open workspaces"
        />
      ) : loading || !workspace || !overview || !form ? (
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--surface)] px-5 py-8 text-sm text-[var(--muted)]">
          {error || "Loading limits and overrides..."}
        </div>
      ) : (
        <div className="mx-auto max-w-7xl space-y-6">
          <WorkspaceStatusBanner workspace={workspace} />
          <WorkspaceConsoleTabs workspaceId={workspace.id} activeSlug="overrides" />

          <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)]">
            <div className="max-w-3xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Limits & Overrides
              </div>
              <h1 className="mt-3 text-[1.6rem] font-semibold tracking-tight text-[var(--text)]">
                Per-workspace quota overrides
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                These values override the shared plan just for this workspace. Leave a field blank to fall back to the plan default.
              </p>
            </div>
          </section>

          {error ? (
            <section className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </section>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <section
                key={card.label}
                className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  {card.label}
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text)]">
                  {card.effective}
                </div>
                <div className="mt-2 text-sm text-[var(--muted)]">
                  Current override: {card.override ?? "Plan default"}
                </div>
                <div className="mt-4">
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Override value
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form[card.formKey]}
                    onChange={(event) =>
                      setForm((current) =>
                        current
                          ? {
                              ...current,
                              [card.formKey]: event.target.value,
                            }
                          : current
                      )
                    }
                    className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)]"
                    placeholder="Leave blank to inherit plan default"
                  />
                </div>
                <div className="mt-3 text-sm leading-6 text-[var(--muted)]">{card.helper}</div>
              </section>
            ))}
          </div>

          <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Save overrides
                </div>
                <div className="mt-2 text-sm text-[var(--muted)]">
                  Saving here updates runtime validation for campaigns, projects, bots, users, integrations, and AI replies.
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)]"
                >
                  Reset form
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-[1rem] border border-[rgba(129,140,248,0.4)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save overrides"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
