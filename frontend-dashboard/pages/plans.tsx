import { useEffect, useMemo, useState } from "react";

import PageAccessNotice from "../components/access/PageAccessNotice";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useVisibility } from "../hooks/useVisibility";
import { planService, type Plan } from "../services/planService";
import { confirmAction, notify } from "../store/uiStore";

const EMPTY_FORM: Partial<Plan> = {
  id: "",
  name: "",
  description: "",
  monthly_price_inr: 0,
  yearly_price_inr: 0,
  monthly_price_usd: 0,
  yearly_price_usd: 0,
  max_campaigns: 0,
  max_numbers: 0,
  max_users: 0,
  max_projects: 0,
  max_integrations: 0,
  max_bots: 0,
  included_users: 0,
  workspace_limit: 1,
  project_limit: 0,
  agent_seat_limit: 0,
  active_bot_limit: 0,
  monthly_campaign_limit: 0,
  ai_reply_limit: 0,
  extra_agent_seat_price_inr: 0,
  pricing_model: "standard",
  support_tier: "standard",
  allowed_platforms: ["whatsapp", "website", "api"],
  features: {},
  wallet_pricing: {
    marketing: { amount: 1.05 },
    utility: { amount: 1.05 },
    service: { amount: 1.05 },
  },
  status: "active",
};

function parseJsonObject(value: string) {
  if (!value.trim()) return {};
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("Enter valid JSON for structured pricing/features.");
  }
}

const PLAN_FORM_SECTIONS: Array<{
  title: string;
  fields: Array<[string, string, string]>;
}> = [
  {
    title: "Plan Identity",
    fields: [
      ["id", "Plan ID", "Internal plan key, for example starter or growth"],
      ["name", "Plan Name", "User-facing plan name"],
      ["description", "Description", "Short summary of what this plan is for"],
      ["pricing_model", "Pricing Model", "Examples: standard, custom, enterprise, usage_based"],
      ["support_tier", "Support Tier", "Support SLA or service tier for this plan"],
    ],
  },
  {
    title: "Pricing",
    fields: [
      ["monthly_price_inr", "Monthly Price (INR)", "Base monthly subscription price in INR"],
      ["yearly_price_inr", "Yearly Price (INR)", "Base yearly subscription price in INR"],
      ["extra_agent_seat_price_inr", "Extra Seat Price (INR)", "Per-seat overage price after included seats are used"],
    ],
  },
  {
    title: "Limits",
    fields: [
      ["workspace_limit", "Workspace Limit", "How many workspaces this plan can cover"],
      ["project_limit", "Project Limit", "Maximum number of projects allowed"],
      ["max_users", "Maximum Users", "Hard upper cap on total users allowed in the workspace"],
      ["included_users", "Included Seats", "Users included before extra seat pricing applies"],
      ["agent_seat_limit", "Agent Seat Limit", "Seat limit used by billing and seat enforcement"],
      ["active_bot_limit", "Active Bot Limit", "Maximum active bots allowed at the same time"],
      ["monthly_campaign_limit", "Monthly Campaign Limit", "How many campaign runs are allowed per billing period"],
      ["ai_reply_limit", "AI Reply Limit", "Included AI replies before overage handling starts"],
    ],
  },
];

export default function PlansPage() {
  const { canViewPage } = useVisibility();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<any>({
    ...EMPTY_FORM,
    allowedPlatformsText: (EMPTY_FORM.allowed_platforms || []).join(", "),
    walletPricingText: JSON.stringify(EMPTY_FORM.wallet_pricing, null, 2),
    featuresText: JSON.stringify(EMPTY_FORM.features, null, 2),
  });
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canViewPlansPage = canViewPage("plans");

  const loadPlans = async () => {
    setLoading(true);
    try {
      setError("");
      const rows = await planService.list();
      setPlans(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load plans");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canViewPlansPage) {
      setPlans([]);
      return;
    }

    loadPlans().catch(console.error);
  }, [canViewPlansPage]);

  const activeCount = useMemo(
    () => plans.filter((plan) => String(plan.status || "").toLowerCase() === "active").length,
    [plans]
  );

  const resetForm = () => {
    setEditingId("");
    setForm({
      ...EMPTY_FORM,
      allowedPlatformsText: (EMPTY_FORM.allowed_platforms || []).join(", "),
      walletPricingText: JSON.stringify(EMPTY_FORM.wallet_pricing, null, 2),
      featuresText: JSON.stringify(EMPTY_FORM.features, null, 2),
    });
  };

  const hydrateForm = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({
      ...plan,
      allowedPlatformsText: (plan.allowed_platforms || []).join(", "),
      walletPricingText: JSON.stringify(plan.wallet_pricing || {}, null, 2),
      featuresText: JSON.stringify(plan.features || {}, null, 2),
    });
  };

  const getPayload = () => ({
    id: String(form.id || "").trim().toLowerCase(),
    name: String(form.name || "").trim(),
    description: String(form.description || "").trim(),
    monthly_price_inr: Number(form.monthly_price_inr || 0),
    yearly_price_inr: Number(form.yearly_price_inr || 0),
    monthly_price_usd: Number(form.monthly_price_usd || 0),
    yearly_price_usd: Number(form.yearly_price_usd || 0),
    max_campaigns: Number(form.max_campaigns || 0),
    max_numbers: Number(form.max_numbers || 0),
    max_users: Number(form.max_users || 0),
    max_projects: Number(form.max_projects || 0),
    max_integrations: Number(form.max_integrations || 0),
    max_bots: Number(form.max_bots || 0),
    included_users: Number(form.included_users || 0),
    workspace_limit: Number(form.workspace_limit || 0),
    project_limit: Number(form.project_limit || 0),
    agent_seat_limit: Number(form.agent_seat_limit || 0),
    active_bot_limit: Number(form.active_bot_limit || 0),
    monthly_campaign_limit: Number(form.monthly_campaign_limit || 0),
    ai_reply_limit: Number(form.ai_reply_limit || 0),
    extra_agent_seat_price_inr: Number(form.extra_agent_seat_price_inr || 0),
    pricing_model: String(form.pricing_model || "standard").trim().toLowerCase(),
    support_tier: String(form.support_tier || "standard").trim(),
    allowed_platforms: String(form.allowedPlatformsText || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
    wallet_pricing: parseJsonObject(String(form.walletPricingText || "{}")),
    features: parseJsonObject(String(form.featuresText || "{}")),
    status: String(form.status || "active").trim().toLowerCase(),
  });

  const handleSave = async () => {
    try {
      const payload = getPayload();
      if (!payload.id || !payload.name) {
        setError("Plan id and name are required.");
        return;
      }

      setSaving(true);
      setError("");
      if (editingId) {
        await planService.update(editingId, payload);
        notify("Plan updated.", "success");
      } else {
        await planService.create(payload);
        notify("Plan created.", "success");
      }
      resetForm();
      await loadPlans();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!(await confirmAction("Deactivate plan", `Deactivate ${plan.name}?`, "Deactivate"))) {
      return;
    }

    try {
      await planService.remove(plan.id);
      notify("Plan deactivated.", "success");
      if (editingId === plan.id) {
        resetForm();
      }
      await loadPlans();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to deactivate plan");
    }
  };

  return (
    <DashboardLayout>
      {!canViewPlansPage ? (
        <PageAccessNotice
          title="Plan controls are restricted for this role"
          description="Only platform operators can review and edit plan baselines."
          href="/"
          ctaLabel="Open dashboard"
        />
      ) : (
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Global Plans
                </div>
                <h1 className="mt-3 text-[1.6rem] font-semibold tracking-tight text-[var(--text)]">
                  Pricing, limits, and overage controls
                </h1>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Plans</div>
                  <div className="mt-1 text-xl font-semibold text-[var(--text)]">{plans.length}</div>
                </div>
                <div className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Active</div>
                  <div className="mt-1 text-xl font-semibold text-[var(--text)]">{activeCount}</div>
                </div>
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
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {editingId ? "Edit Plan" : "Create Plan"}
              </div>
              <div className="mt-5 space-y-5">
                {PLAN_FORM_SECTIONS.map((section) => (
                  <section key={section.title} className="space-y-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      {section.title}
                    </div>
                    <div className="grid gap-3">
                      {section.fields.map(([key, label, helper]) => (
                        <label key={key} className="space-y-2">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                            {label}
                          </div>
                          <input
                            type={key.includes("price") || key.includes("limit") ? "number" : "text"}
                            disabled={saving || (editingId !== "" && key === "id")}
                            value={form[key] ?? ""}
                            onChange={(event) => setForm((current: any) => ({ ...current, [key]: event.target.value }))}
                            className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)] outline-none"
                            placeholder={label}
                          />
                          <div className="text-xs text-[var(--muted)]">{helper}</div>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
                <label className="space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Allowed Platforms
                  </div>
                  <input
                    value={form.allowedPlatformsText || ""}
                    onChange={(event) => setForm((current: any) => ({ ...current, allowedPlatformsText: event.target.value }))}
                    className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)] outline-none"
                    placeholder="whatsapp, website, api"
                  />
                  <div className="text-xs text-[var(--muted)]">
                    Comma-separated platform list available on this plan.
                  </div>
                </label>
                <select
                  value={form.status || "active"}
                  onChange={(event) => setForm((current: any) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)] outline-none"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
                <label className="space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Wallet Pricing JSON
                  </div>
                  <textarea
                    value={form.walletPricingText || "{}"}
                    onChange={(event) => setForm((current: any) => ({ ...current, walletPricingText: event.target.value }))}
                    className="min-h-[140px] w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)] outline-none"
                    placeholder="Wallet pricing JSON"
                  />
                  <div className="text-xs text-[var(--muted)]">
                    Category-based wallet charging rules, for example marketing, utility, and service rates.
                  </div>
                </label>
                <label className="space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Feature Flags JSON
                  </div>
                  <textarea
                    value={form.featuresText || "{}"}
                    onChange={(event) => setForm((current: any) => ({ ...current, featuresText: event.target.value }))}
                    className="min-h-[120px] w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] px-4 py-3 text-sm text-[var(--text)] outline-none"
                    placeholder="Features JSON"
                  />
                  <div className="text-xs text-[var(--muted)]">
                    Plan capability flags like broadcasts, analytics, api access, or priority support.
                  </div>
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 rounded-2xl border border-[rgba(129,140,248,0.4)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editingId ? "Save Plan" : "Create Plan"}
                  </button>
                  {editingId ? (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text)]"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              {loading ? (
                <section className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--surface)] px-5 py-8 text-sm text-[var(--muted)]">
                  Loading plan catalog...
                </section>
              ) : (
                plans.map((plan) => (
                  <section
                    key={plan.id}
                    className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-base font-semibold text-[var(--text)]">
                          {plan.name} <span className="text-xs text-[var(--muted)]">({plan.id})</span>
                        </div>
                    <div className="mt-2 text-sm text-[var(--muted)]">{plan.description || "No description set."}</div>
                        <div className="mt-2 text-xs text-[var(--muted)]">Pricing model: {plan.pricing_model || "standard"}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => hydrateForm(plan)}
                          className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-xs font-semibold text-[var(--text)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(plan)}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                        >
                          Deactivate
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)]">
                        INR {plan.monthly_price_inr}/mo
                      </div>
                      <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)]">
                        Seats: {plan.agent_seat_limit ?? plan.included_users ?? plan.max_users ?? 0}
                      </div>
                      <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)]">
                        AI replies: {plan.ai_reply_limit ?? "unlimited"}
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-[var(--muted)]">
                      Included users: {plan.included_users ?? 0} • Max users: {plan.max_users ?? 0}
                    </div>
                    <div className="mt-2 text-xs text-[var(--muted)]">
                      Platforms: {(plan.allowed_platforms || []).join(", ") || "Not set"}
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
