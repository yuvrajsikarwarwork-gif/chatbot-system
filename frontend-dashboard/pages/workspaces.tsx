import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import PageAccessNotice from "../components/access/PageAccessNotice";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useVisibility } from "../hooks/useVisibility";
import { planService } from "../services/planService";
import { workspaceService, type Workspace } from "../services/workspaceService";
import { useAuthStore } from "../store/authStore";
import { notify } from "../store/uiStore";

const EMPTY_FORM = {
  companyName: "",
  companyWebsite: "",
  industry: "",
  gstin: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  planId: "starter",
  billingCycle: "monthly",
  initialWalletTopup: "",
  status: "active",
};

export default function WorkspacesPage() {
  const { canViewPage } = useVisibility();
  const setActiveWorkspace = useAuthStore((state) => state.setActiveWorkspace);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);
  const resolvedAccess = useAuthStore((state) => state.resolvedAccess);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [plans, setPlans] = useState<Array<{ id: string; name?: string }>>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canViewWorkspacesPage = canViewPage("workspaces");
  const accessPending =
    !hasHydrated ||
    (["super_admin", "developer"].includes(String(user?.role || "")) &&
      !resolvedAccess);

  const loadPage = async () => {
    setLoading(true);
    try {
      setError("");
      const [workspaceRows, planRows] = await Promise.all([workspaceService.list(), planService.list()]);
      setWorkspaces(Array.isArray(workspaceRows) ? workspaceRows : []);
      setPlans(Array.isArray(planRows) ? planRows : []);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load workspaces");
      setWorkspaces([]);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canViewWorkspacesPage) return;
    loadPage().catch(console.error);
  }, [canViewWorkspacesPage]);

  const stats = useMemo(
    () => ({
      total: workspaces.length,
      active: workspaces.filter((workspace) => workspace.status === "active").length,
      suspended: workspaces.filter((workspace) => workspace.status === "suspended").length,
    }),
    [workspaces]
  );

  const handleCreate = async () => {
    if (!form.companyName.trim() || !form.ownerName.trim() || !form.ownerEmail.trim()) {
      setError("Company name, owner name, and owner email are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await workspaceService.create({
        companyName: form.companyName,
        companyWebsite: form.companyWebsite || null,
        industry: form.industry || null,
        gstin: form.gstin || null,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        ownerPhone: form.ownerPhone || null,
        planId: form.planId,
        billingCycle: form.billingCycle,
        initialWalletTopup: Number(form.initialWalletTopup || 0),
        status: form.status,
      });
      notify("Workspace created.", "success");
      setForm(EMPTY_FORM);
      await loadPage();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create workspace");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      {accessPending ? (
        <section className="mx-auto max-w-4xl rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--surface)] px-6 py-10 text-sm text-[var(--muted)] shadow-[var(--shadow-soft)]">
          Loading workspace controls...
        </section>
      ) : !canViewWorkspacesPage ? (
        <PageAccessNotice
          title="Workspace controls are restricted for this role"
          description="Workspace administration is only available to platform operators."
          href="/"
          ctaLabel="Open dashboard"
        />
      ) : (
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Workspace Onboarding
                </div>
                <h1 className="mt-3 text-[1.7rem] font-semibold tracking-tight text-[var(--text)]">
                  Create verified client workspaces
                </h1>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Total", value: stats.total },
                  { label: "Active", value: stats.active },
                  { label: "Suspended", value: stats.suspended },
                ].map((card) => (
                  <div key={card.label} className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{card.label}</div>
                    <div className="mt-1 text-xl font-semibold text-[var(--text)]">{card.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {error ? (
            <section className="rounded-[1.2rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </section>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
            <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Create Workspace</div>
              <div className="mt-5 space-y-5">
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Company details</div>
                  <input className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)]" placeholder="Company name" value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} />
                  <input className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)]" placeholder="Company website" value={form.companyWebsite} onChange={(event) => setForm((current) => ({ ...current, companyWebsite: event.target.value }))} />
                  <input className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)]" placeholder="Industry / category" value={form.industry} onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))} />
                  <input className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)]" placeholder="GSTIN / tax id" value={form.gstin} onChange={(event) => setForm((current) => ({ ...current, gstin: event.target.value }))} />
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Primary account owner</div>
                  <input className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)]" placeholder="Full name" value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} />
                  <input className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)]" placeholder="Email address" value={form.ownerEmail} onChange={(event) => setForm((current) => ({ ...current, ownerEmail: event.target.value }))} />
                  <input className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)]" placeholder="Phone number" value={form.ownerPhone} onChange={(event) => setForm((current) => ({ ...current, ownerPhone: event.target.value }))} />
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Plan & billing</div>
                  <select className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)]" value={form.planId} onChange={(event) => setForm((current) => ({ ...current, planId: event.target.value }))}>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name || plan.id}
                      </option>
                    ))}
                  </select>
                  <select className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)]" value={form.billingCycle} onChange={(event) => setForm((current) => ({ ...current, billingCycle: event.target.value }))}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <input className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)]" placeholder="Initial wallet top-up (optional)" value={form.initialWalletTopup} onChange={(event) => setForm((current) => ({ ...current, initialWalletTopup: event.target.value }))} />
                  <button type="button" onClick={handleCreate} disabled={saving} className="w-full rounded-2xl border border-[rgba(129,140,248,0.4)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white disabled:opacity-50">
                    {saving ? "Creating..." : "Create workspace"}
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              {loading ? (
                <section className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--surface)] px-5 py-8 text-sm text-[var(--muted)]">
                  Loading workspace directory...
                </section>
              ) : (
                workspaces.map((workspace) => (
                  <section key={workspace.id} className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-base font-semibold text-[var(--text)]">{workspace.name}</div>
                        <div className="mt-2 text-sm text-[var(--muted)]">
                          {workspace.industry || "Uncategorized"} • {workspace.subscription_plan_name || workspace.effective_plan_id || workspace.plan_id}
                        </div>
                        <div className="mt-2 text-xs text-[var(--muted)]">
                          {workspace.company_website || "No website"} {workspace.tax_id ? `• GSTIN ${workspace.tax_id}` : ""}
                        </div>
                      </div>
                      <div className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                        {workspace.status}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)]">
                        Billing: {workspace.subscription_status || "unknown"}
                      </div>
                      <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)]">
                        Seats: {workspace.seat_quantity ?? 0}
                      </div>
                      <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)]">
                        Wallet top-up: {workspace.wallet_auto_topup_enabled ? "On" : "Off"}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link href={`/workspaces/${workspace.id}`} onClick={() => setActiveWorkspace(workspace.id)} className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)]">
                        Overview
                      </Link>
                    </div>
                  </section>
                ))
              )}
            </section>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
