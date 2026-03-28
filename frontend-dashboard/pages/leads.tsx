import { useEffect, useMemo, useState } from "react";
import { Activity, Filter, Globe, RefreshCw, Route, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import PageAccessNotice from "../components/access/PageAccessNotice";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useVisibility } from "../hooks/useVisibility";
import { campaignService, CampaignDetail, CampaignSummary } from "../services/campaignService";
import { leadFormService, type LeadFormRecord } from "../services/leadFormService";
import { leadService } from "../services/leadService";
import { useAuthStore } from "../store/authStore";

const PLATFORMS = ["whatsapp", "website", "facebook", "instagram", "api", "telegram"];
const STATUS_OPTIONS = ["new", "captured", "qualified", "engaged"];
const ATTR_KEYS = ["utm_source", "utm_medium", "entry_point_id", "channel", "campaign_id", "chat_id", "chat_url", "entry_channel"];

const fmtPlatform = (p: string) => {
  const v = String(p || "").trim().toLowerCase();
  if (!v) return "Unknown";
  return v === "api" ? "API" : v.charAt(0).toUpperCase() + v.slice(1);
};
const fmtStatus = (s: string) => {
  const v = String(s || "").trim().toLowerCase();
  if (!v) return "Unknown";
  return v.charAt(0).toUpperCase() + v.slice(1);
};
const fmtTime = (v?: string | null) => {
  if (!v) return "Not synced yet";
  try { return new Date(v).toLocaleString(); } catch { return "Not synced yet"; }
};
const badgeClass = (p: string) => {
  const v = String(p || "").trim().toLowerCase();
  if (v === "whatsapp") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (v === "instagram") return "bg-rose-50 text-rose-700 border-rose-200";
  if (v === "facebook") return "bg-blue-50 text-blue-700 border-blue-200";
  if (v === "telegram") return "bg-cyan-50 text-cyan-700 border-cyan-200";
  if (v === "website") return "bg-violet-50 text-violet-700 border-violet-200";
  if (v === "api") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
};
const normObj = (v: unknown) => (!v || typeof v !== "object" || Array.isArray(v) ? {} : (v as Record<string, unknown>));
const labelize = (k: string) => String(k || "").replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()).trim();
const fmtValue = (v: unknown) => v === null || v === undefined || v === "" ? "Not provided" : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v);

function getResolvedLeadFlowName(lead: any, details: Record<string, CampaignDetail>) {
  if (lead?.flow_name) return lead.flow_name;
  const campaignId = String(lead?.campaign_id || "").trim();
  const entryId = String(lead?.entry_point_id || "").trim();
  if (!campaignId || !entryId) return "";
  const detail = details[campaignId];
  const entry = Array.isArray(detail?.entryPoints) ? detail.entryPoints.find((e: any) => String(e.id || "").trim() === entryId) : null;
  return String(entry?.flow_name || entry?.name || "").trim();
}

export default function LeadsPage() {
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const activeProject = useAuthStore((s) => s.activeProject);
  const hasWorkspacePermission = useAuthStore((s) => s.hasWorkspacePermission);
  const { canViewPage } = useVisibility();
  const canViewLeads = hasWorkspacePermission(activeWorkspace?.workspace_id, "view_leads");
  const canDeleteLeads = hasWorkspacePermission(activeWorkspace?.workspace_id, "delete_leads");
  const canViewLeadsPage = canViewPage("leads");

  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [campaignDetailsById, setCampaignDetailsById] = useState<Record<string, CampaignDetail>>({});
  const [campaignDetail, setCampaignDetail] = useState<CampaignDetail | null>(null);
  const [leadForms, setLeadForms] = useState<LeadFormRecord[]>([]);
  const [listSummaries, setListSummaries] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    platform: "", campaignId: "", channelId: "", entryPointId: "", flowId: "", listId: "", leadFormId: "", status: "", search: "",
  });

  const loadCampaigns = async () => {
    if (!activeWorkspace?.workspace_id || !activeProject?.id) { setCampaigns([]); setCampaignDetailsById({}); return; }
    try {
      const data = await campaignService.list({ workspaceId: activeWorkspace.workspace_id, projectId: activeProject.id });
      setCampaigns(data);
      const entries = await Promise.all(data.map(async (c) => {
        try { return [c.id, await campaignService.get(c.id)] as const; } catch { return [c.id, null] as const; }
      }));
      setCampaignDetailsById(entries.reduce<Record<string, CampaignDetail>>((acc, [id, detail]) => {
        if (detail) acc[id] = detail;
        return acc;
      }, {}));
    } catch (e: any) { setErrorMessage(e?.message || "Failed to load campaigns."); }
  };
  const loadLeadForms = async () => {
    try {
      const data = await leadFormService.list(activeWorkspace?.workspace_id || undefined, activeProject?.id || undefined);
      setLeadForms(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErrorMessage(e?.message || "Failed to load lead forms.");
      setLeadForms([]);
    }
  };
  const loadLeadLists = async (campaignId?: string) => {
    try {
      const data = await leadService.listSummaries(campaignId || undefined, activeWorkspace?.workspace_id || undefined, activeProject?.id || undefined);
      setListSummaries(data);
    } catch (e: any) { setErrorMessage(e?.message || "Failed to load lead lists."); }
  };
  const loadLeads = async (nextFilters = filters) => {
    if (!activeWorkspace?.workspace_id || !activeProject?.id || !canViewLeads) { setLeads([]); setLoading(false); return; }
    setLoading(true);
    try {
      setErrorMessage(null);
      const data = await leadService.list({ ...nextFilters, workspaceId: activeWorkspace.workspace_id, projectId: activeProject.id });
      setLeads(data);
      setLastSyncedAt(new Date().toISOString());
      if (selectedLead) setSelectedLead(data.find((lead: any) => lead.id === selectedLead.id) || null);
    } catch (e: any) {
      setErrorMessage(e?.message || "Failed to load leads.");
      setLeads([]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!canViewLeadsPage) {
      setCampaigns([]); setCampaignDetailsById({}); setLeadForms([]); setListSummaries([]); setLeads([]); setLoading(false); return;
    }
    loadCampaigns().then(loadLeadForms).then(() => loadLeadLists()).then(() => loadLeads()).catch(console.error);
  }, [activeWorkspace?.workspace_id, activeProject?.id, canViewLeads, canViewLeadsPage]);

  useEffect(() => {
    if (!filters.campaignId) { setCampaignDetail(null); return; }
    const detail = campaignDetailsById[filters.campaignId];
    if (detail) { setCampaignDetail(detail); return; }
    campaignService.get(filters.campaignId).then(setCampaignDetail).catch(console.error);
  }, [filters.campaignId, campaignDetailsById]);

  useEffect(() => {
    if (!canViewLeadsPage) return;
    loadLeadLists(filters.campaignId).catch(console.error);
    loadLeads(filters).catch(console.error);
  }, [filters, activeWorkspace?.workspace_id, activeProject?.id, canViewLeads, canViewLeadsPage]);

  const campaignsForPlatform = useMemo(() => !filters.platform ? campaigns : campaigns.filter((c) => {
    const detail = campaignDetailsById[c.id];
    return Boolean(detail?.channels?.some((ch: any) => String(ch.platform || ch.platform_type || "").trim().toLowerCase() === filters.platform));
  }), [campaigns, campaignDetailsById, filters.platform]);
  const availableChannels = useMemo(() => {
    const channels = campaignDetail?.channels || [];
    return !filters.platform ? channels : channels.filter((ch: any) => String(ch.platform || ch.platform_type || "").trim().toLowerCase() === filters.platform);
  }, [campaignDetail, filters.platform]);
  const availableEntryPoints = useMemo(() => (campaignDetail?.entryPoints || []).filter((e: any) => !filters.channelId || e.channel_id === filters.channelId), [campaignDetail, filters.channelId]);
  const availableFlowOptions = useMemo(() => availableEntryPoints.reduce((acc: any[], e: any) => {
    if (!e.flow_id || acc.some((i) => i.id === e.flow_id)) return acc;
    acc.push({ id: e.flow_id, name: e.flow_name || e.name || "Unnamed flow" });
    return acc;
  }, []), [availableEntryPoints]);
  const availableLists = useMemo(() => {
    const scoped = filters.campaignId ? listSummaries.filter((l) => (!filters.campaignId || l.campaign_id === filters.campaignId) && (!filters.channelId || l.channel_id === filters.channelId) && (!filters.entryPointId || l.entry_point_id === filters.entryPointId)) : listSummaries;
    return !filters.platform ? scoped : scoped.filter((l) => String(l.platform || "").trim().toLowerCase() === filters.platform);
  }, [filters.campaignId, filters.channelId, filters.entryPointId, filters.platform, listSummaries]);

  const selectedLeadFlowName = selectedLead ? getResolvedLeadFlowName(selectedLead, campaignDetailsById) : "";
  const selectedLeadForm = leadForms.find((f) => String(f.id) === String(selectedLead?.lead_form_id || "")) || null;
  const selectedLeadCustomVariables = normObj(selectedLead?.custom_variables);
  const selectedLeadCustomEntries = Object.entries(selectedLeadCustomVariables).filter(([k, v]) => !ATTR_KEYS.includes(String(k)) && v !== null && v !== undefined && String(v).trim() !== "");
  const selectedLeadAttributionEntries = Object.entries(selectedLeadCustomVariables).filter(([k, v]) => ATTR_KEYS.includes(String(k)) && v !== null && v !== undefined && String(v).trim() !== "");
  const selectedLeadFlowProgress = selectedLead ? [
    selectedLead.campaign_name || "No campaign",
    selectedLead.entry_point_name || "Default entry",
    selectedLeadFlowName || "Default flow",
    selectedLead.lead_form_name || selectedLeadForm?.name || "No linked form",
  ] : [];

  const handleDelete = async (id: string) => {
    if (!canDeleteLeads) return;
    await leadService.remove(id);
    await loadLeads();
    if (selectedLead?.id === id) setSelectedLead(null);
  };
  const handleRefresh = async () => { await loadLeadForms(); await loadLeadLists(filters.campaignId); await loadLeads(filters); };

  return (
    <DashboardLayout>
      {!canViewLeadsPage ? (
        <PageAccessNotice title="Leads are restricted for this role" description="Lead visibility follows workspace, project, and assigned-scope rules. Platform operators should stay in support tools." href="/" ctaLabel="Open dashboard" />
      ) : (
        <div className="min-h-screen space-y-5 text-foreground">
          {!activeWorkspace?.workspace_id || !activeProject?.id ? (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-card p-8 text-sm text-muted">Select a workspace and project first. Leads are shown inside the active project only.</div>
          ) : !canViewLeads ? (
            <div className="rounded-[1.5rem] border border-dashed border-amber-200 bg-amber-50 p-8 text-sm text-amber-700">Lead visibility is restricted for your current workspace role. Ask an admin to grant the <span className="font-semibold">view leads</span> permission if you need access.</div>
          ) : null}
          {errorMessage ? <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{errorMessage}</div> : null}

          <div className="rounded-[1.5rem] border border-border bg-card p-4 shadow-sm transition-colors duration-300">
            <div className="space-y-4">
              <div className="grid gap-3 xl:grid-cols-[220px_1fr_auto]">
                <select className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm" value={filters.platform} onChange={(e) => setFilters((p) => ({ ...p, platform: e.target.value, campaignId: "", channelId: "", entryPointId: "", flowId: "", listId: "", leadFormId: "" }))}>
                  <option value="">All platforms</option>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{fmtPlatform(p)}</option>)}
                </select>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted" placeholder="Search lead, company, phone, email..." value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setShowAdvancedFilters((p) => !p)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-transparent px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-foreground transition hover:bg-primary-fade hover:text-primary hover:border-primary/30">
                    <SlidersHorizontal size={14} />{showAdvancedFilters ? "Hide filters" : "More filters"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary-fade px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-primary"><Filter size={12} />Status</div>
                  <button onClick={() => setFilters((p) => ({ ...p, status: "" }))} className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition ${!filters.status ? "bg-primary text-white" : "border border-border bg-transparent text-foreground hover:bg-primary-fade hover:text-primary hover:border-primary/30"}`}>All</button>
                  {STATUS_OPTIONS.map((s) => <button key={s} onClick={() => setFilters((p) => ({ ...p, status: s }))} className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition ${filters.status === s ? "bg-primary text-white" : "border border-border bg-transparent text-foreground hover:bg-primary-fade hover:text-primary hover:border-primary/30"}`}>{fmtStatus(s)}</button>)}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-fade px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary"><Activity size={14} />Last sync {fmtTime(lastSyncedAt)}</div>
                  <button onClick={handleRefresh} className="inline-flex items-center gap-2 rounded-full border border-border bg-transparent px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition hover:bg-primary-fade hover:text-primary hover:border-primary/30"><RefreshCw size={14} />Refresh</button>
                </div>
              </div>

              {showAdvancedFilters ? (
                <div className="grid gap-3 xl:grid-cols-6">
                  <select className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" value={filters.campaignId} onChange={(e) => setFilters((p) => ({ ...p, campaignId: e.target.value, channelId: "", entryPointId: "", flowId: "", listId: "" }))}>
                    <option value="">All campaigns</option>
                    {campaignsForPlatform.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" value={filters.flowId} onChange={(e) => setFilters((p) => ({ ...p, flowId: e.target.value }))} disabled={!filters.campaignId}>
                    <option value="">All flows</option>
                    {availableFlowOptions.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <select className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" value={filters.listId} onChange={(e) => setFilters((p) => ({ ...p, listId: e.target.value }))}>
                    <option value="">All lists</option>
                    {availableLists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  <select className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" value={filters.leadFormId} onChange={(e) => setFilters((p) => ({ ...p, leadFormId: e.target.value }))}>
                    <option value="">All lead forms</option>
                    {leadForms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <select className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm" value={filters.channelId} onChange={(e) => setFilters((p) => ({ ...p, channelId: e.target.value, entryPointId: "", listId: "" }))} disabled={!filters.campaignId}>
                    <option value="">All channels</option>
                    {availableChannels.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm" value={filters.entryPointId} onChange={(e) => setFilters((p) => ({ ...p, entryPointId: e.target.value, listId: "" }))} disabled={!filters.campaignId}>
                    <option value="">All entry points</option>
                    {availableEntryPoints.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[2.25fr_0.75fr]">
            <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
                <div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Lead Journey Table</div><div className="mt-1 text-sm text-muted">Source, route, and state in one place.</div></div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{loading ? "Loading..." : `${leads.length} rows`}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-200 bg-white text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    <tr><th className="px-6 py-4">Lead</th><th className="px-6 py-4">Source</th><th className="px-6 py-4">Campaign</th><th className="px-6 py-4">Journey</th><th className="px-6 py-4">Current State</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {leads.map((lead: any) => (
                      <tr key={lead.id} onClick={() => setSelectedLead(lead)} className={`cursor-pointer transition hover:bg-primary-fade ${selectedLead?.id === lead.id ? "bg-primary-fade" : ""}`}>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{lead.name || lead.wa_name || "Unknown"}</div>
                          <div className="mt-1 text-xs text-slate-500">{lead.company_name || "No company"}</div>
                          <div className="mt-1 text-xs text-slate-500">{lead.phone || lead.wa_number || "No phone"}</div>
                          <div className="mt-1 text-xs text-slate-500">{lead.email || "No email"}</div>
                        </td>
                        <td className="px-6 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${badgeClass(lead.platform || "")}`}>{fmtPlatform(lead.platform || "unknown")}</span></td>
                        <td className="min-w-[220px] px-6 py-4 text-sm text-slate-700"><div className="font-semibold text-slate-800">{lead.campaign_name || "Unassigned"}</div><div className="mt-1 text-xs text-slate-500">{lead.entry_point_name || "Default entry"}</div></td>
                        <td className="min-w-[240px] px-6 py-4 text-sm text-slate-700"><div className="font-semibold text-slate-800">{getResolvedLeadFlowName(lead, campaignDetailsById) || "Default flow"}</div><div className="mt-1 text-xs text-slate-500">{lead.lead_form_name || lead.list_name || "Auto list"}</div></td>
                        <td className="px-6 py-4"><div className="font-semibold text-slate-800">{fmtStatus(lead.status || "new")}</div><div className="mt-1 text-xs text-slate-500">{lead.platform ? `Last seen on ${fmtPlatform(lead.platform)}` : "Source pending"}</div></td>
                      </tr>
                    ))}
                    {!loading && leads.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-muted">No leads found for the selected filter set.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted"><Route size={14} />Lead Context</div>
                {!selectedLead ? (
                  <div className="text-sm leading-6 text-muted">Select a lead to inspect its current route, source, attribution, and captured answers.</div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-lg font-black text-slate-900">{selectedLead.name || selectedLead.wa_name || "Unknown"}</div>
                      <div className="mt-2 text-sm text-slate-500">{selectedLead.phone || selectedLead.wa_number || "No phone"} | {selectedLead.email || "No email"}</div>
                      <div className="mt-2 text-sm text-slate-500">{selectedLead.company_name || "No company name"}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4"><div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"><Filter size={12} />Lead Form</div><div className="text-sm font-semibold text-slate-800">{selectedLead.lead_form_name || selectedLeadForm?.name || "No linked form"}</div></div>
                    <div className="rounded-xl border border-slate-200 p-4"><div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"><Globe size={12} />Source Badge</div><span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${badgeClass(selectedLead.platform || "")}`}>{fmtPlatform(selectedLead.platform || "unknown")}</span></div>
                    <div className="rounded-xl border border-slate-200 p-4"><div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"><Activity size={12} />Current Route</div><div className="space-y-2 text-sm font-semibold text-slate-800">{selectedLeadFlowProgress.map((item, i) => <div key={`${item}-${i}`} className="flex items-center gap-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">{i + 1}</span><span>{item}</span></div>)}</div></div>
                    <div className="rounded-xl border border-slate-200 p-4"><div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"><Filter size={12} />Current State</div><div className="text-sm font-semibold text-slate-800">{fmtStatus(selectedLead.status || "new")}</div></div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Standard Fields</div>
                      <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Full Name</span><span className="font-semibold text-slate-900">{selectedLead.name || selectedLead.wa_name || "Not provided"}</span></div>
                        <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Email</span><span className="font-semibold text-slate-900">{selectedLead.email || "Not provided"}</span></div>
                        <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Phone</span><span className="font-semibold text-slate-900">{selectedLead.phone || selectedLead.wa_number || "Not provided"}</span></div>
                        <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Company</span><span className="font-semibold text-slate-900">{selectedLead.company_name || "Not provided"}</span></div>
                      </div>
                    </div>
                    {selectedLeadCustomEntries.length > 0 ? <div className="rounded-xl border border-slate-200 p-4"><div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Custom Responses</div><div className="space-y-3">{selectedLeadCustomEntries.map(([key, value]) => { const field = selectedLeadForm?.fields?.find((f) => String(f.fieldKey) === String(key)); return <div key={key} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><div className="text-sm text-slate-500">{field?.questionLabel || labelize(key)}</div><div className="max-w-[55%] text-right text-sm font-semibold text-slate-900">{fmtValue(value)}</div></div>; })}</div></div> : null}
                    {selectedLeadAttributionEntries.length > 0 ? <div className="rounded-xl border border-slate-200 p-4"><div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Attribution</div><div className="space-y-2 text-sm text-slate-700">{selectedLeadAttributionEntries.map(([key, value]) => <div key={key} className="flex items-start justify-between gap-3"><span className="text-slate-500">{labelize(key)}</span>{key === "chat_url" ? <a href={String(value)} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">Open chat</a> : <span className="max-w-[55%] text-right font-semibold text-slate-900">{fmtValue(value)}</span>}</div>)}</div></div> : null}
                    {availableLists.length > 0 ? <div className="rounded-xl border border-slate-200 p-4"><div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Available Lists</div><div className="flex flex-wrap gap-2">{availableLists.slice(0, 4).map((l) => <span key={l.id} className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">{l.name}</span>)}</div></div> : null}
                    {canDeleteLeads ? <button onClick={() => handleDelete(selectedLead.id)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-red-600 transition hover:bg-red-100"><Trash2 size={14} />Delete Lead</button> : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
