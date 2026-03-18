import { useState, useEffect, useMemo } from "react";
import apiClient from "../services/apiClient";
import DashboardLayout from "../components/layout/DashboardLayout";
import { 
  Search, Filter, Plus, Trash2, Edit, MessageSquare, 
  Smartphone, Mail, Send, X, Globe, AlignLeft, LayoutTemplate,
  Users, CheckCircle, AlertCircle, Clock, BarChart3, Activity, Eye, ShieldCheck, ShieldAlert, Timer
} from "lucide-react";
import CampaignSenderModal from "../components/campaign/CampaignSenderModal";

export default function TemplatesPage() {
  const [activeView, setActiveView] = useState<"templates" | "campaigns">("templates");
  const [templates, setTemplates] = useState<any[]>([]);
  const [campaignLogs, setCampaignLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("whatsapp");
  
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const defaultForm = {
    name: "", platform_type: "whatsapp", category: "marketing",
    language: "en_US", header_type: "none", header: "",
    body: "", footer: "", buttons: [], variables: {}, status: "pending"
  };
  const [formData, setFormData] = useState<any>(defaultForm);

  // Helper for Status Badges
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': 
        return <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase rounded-md border bg-emerald-50 text-emerald-600 border-emerald-200"><ShieldCheck size={12}/> Approved</span>;
      case 'rejected': 
        return <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase rounded-md border bg-red-50 text-red-600 border-red-200"><ShieldAlert size={12}/> Rejected</span>;
      default: 
        return <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase rounded-md border bg-amber-50 text-amber-600 border-amber-200"><Timer size={12}/> Under Review</span>;
    }
  };

  useEffect(() => {
    if (isPanelOpen) {
      const isWA = formData.platform_type === 'whatsapp';
      const isTelegram = formData.platform_type === 'telegram';
      setFormData((prev: any) => ({
        ...prev,
        header_type: isWA ? prev.header_type : 'none',
        header: isWA ? prev.header : '',
        footer: (isWA || isTelegram) ? prev.footer : ''
      }));
    }
  }, [formData.platform_type, isPanelOpen]);

  const dynamicVars = useMemo(() => {
    const matches = formData.body.match(/{{(\d+)}}/g);
    return matches ? Array.from(new Set(matches)) : [];
  }, [formData.body]);

  const previewData: Record<string, string> = {
    name: "Yuvraj Sikarwar",
    wa_number: "+91 6268434155",
    email: "yuvraj@example.com",
    source: "Facebook Ads"
  };

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/templates?platform=${selectedPlatform}`);
      setTemplates(res.data);
      
      // Safely fetch logs (won't crash if the table is empty or missing yet)
      try {
        const logs = await apiClient.get(`/template-logs?platform=${selectedPlatform}`);
        setCampaignLogs(logs.data || []);
      } catch (logErr) {
        setCampaignLogs([]);
      }
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchTemplates(); }, [selectedPlatform, activeView]);

  const handleSave = async () => {
    if (!formData.name || !formData.body) return alert("Name and Body are required.");
    setIsSaving(true);
    try {
      await apiClient.post("/templates", formData);
      setIsPanelOpen(false);
      setFormData(defaultForm);
      fetchTemplates();
    } catch (err) { alert("Failed to save template."); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await apiClient.delete(`/templates/${id}`);
      fetchTemplates();
    } catch (err) { alert("Error deleting template."); }
  };

  const platforms = [
    { id: "whatsapp", name: "WhatsApp", icon: MessageSquare },
    { id: "telegram", name: "Telegram", icon: Send },
    { id: "email", name: "Email", icon: Mail },
    { id: "sms", name: "SMS", icon: Smartphone },
    { id: "instagram", name: "Instagram", icon: Globe }
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F8FAFC] p-8 flex flex-col relative overflow-hidden">
        
        <div className="flex gap-4 mb-8 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit self-center shadow-sm">
          <button onClick={() => setActiveView("templates")} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'templates' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Templates</button>
          <button onClick={() => setActiveView("campaigns")} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'campaigns' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Bulk Dashboard</button>
        </div>

        <div className={`transition-all duration-300 ${isPanelOpen ? 'w-[calc(100%-450px)] pr-8' : 'w-full max-w-7xl mx-auto'}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {activeView === 'templates' ? 'Template Manager' : 'Campaign Analytics'}
              </h1>
              <p className="text-slate-500 text-sm">
                {activeView === 'templates' ? 'Design and manage omnichannel templates.' : 'Real-time tracking of bulk delivery performance.'}
              </p>
            </div>
            
            {activeView === 'templates' && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsCampaignModalOpen(true)} 
                  className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg"
                >
                  <Send size={18} /> Launch Campaign
                </button>
                <button 
                  onClick={() => { setFormData({ ...defaultForm, platform_type: selectedPlatform }); setIsPanelOpen(true); }} 
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  <Plus size={18} /> Create Template
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
            {platforms.map(p => (
              <button key={p.id} onClick={() => setSelectedPlatform(p.id)} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${selectedPlatform === p.id ? "bg-slate-900 text-white shadow-md" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                <p.icon size={16} /> {p.name}
              </button>
            ))}
          </div>

          {activeView === 'templates' ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Template Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Approval Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {templates.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-bold text-slate-900 text-sm flex flex-col">
                        <div className="flex items-center gap-2"><LayoutTemplate size={14} className="text-slate-400"/> {t.name}</div>
                        <span className="text-[9px] text-slate-400 mt-1 flex items-center gap-1"><Clock size={10}/> Updated {new Date(t.updated_at).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">{t.category}</td>
                      <td className="px-6 py-4">
                        {getStatusBadge(t.status)}
                        {t.status === 'rejected' && <p className="text-[9px] text-red-400 mt-1 italic max-w-[150px] truncate">{t.rejected_reason}</p>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            disabled={t.status === 'approved'} 
                            className={`p-2 rounded-lg transition-all ${t.status === 'approved' ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                            title={t.status === 'approved' ? "Approved templates cannot be edited" : "Edit Template"}
                          >
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {templates.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">No templates found for this platform.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total Broadcasts</span>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-black text-slate-900">{campaignLogs.length}</div>
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={20} /></div>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Delivered</span>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-black text-emerald-600">{campaignLogs.reduce((acc, curr) => acc + (curr.success_count || 0), 0)}</div>
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle size={20} /></div>
                    </div>
                 </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Campaign / Template</th>
                      <th className="px-6 py-4">Target Leads</th>
                      <th className="px-6 py-4">Performance</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaignLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 text-sm">{log.campaign_name || 'Quick Blast'}</div>
                          <div className="text-[10px] text-slate-400 font-mono italic">{log.template_name}</div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-600">
                          {log.total_leads || 0} Leads
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${((log.success_count || 0) / (log.total_leads || 1)) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-black text-slate-500">{log.success_count || 0} / {log.total_leads || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-black uppercase">Completed</span>
                        </td>
                      </tr>
                    ))}
                    {campaignLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">No campaigns launched yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Create/Edit Template Panel */}
        <div className={`fixed top-0 right-0 h-full w-[450px] bg-white border-l border-slate-200 shadow-2xl transition-transform duration-300 z-50 flex flex-col ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Configure Template</h2>
            <button onClick={() => setIsPanelOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-all"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Platform</label>
                <div className="grid grid-cols-5 gap-2">
                  {platforms.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => setFormData({...formData, platform_type: p.id})}
                      className={`p-3 rounded-xl border flex items-center justify-center transition-all ${formData.platform_type === p.id ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'}`}
                    >
                      <p.icon size={16} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Internal Name</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="welcome_user_v1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2"><AlignLeft size={14}/> Message Design</h3>
              
              {formData.platform_type === 'whatsapp' && (
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Header Content</label>
                  <div className="flex gap-2">
                    <select className="w-1/3 bg-white border rounded-lg p-2 text-xs outline-none" value={formData.header_type} onChange={e => setFormData({...formData, header_type: e.target.value})}>
                      <option value="none">None</option>
                      <option value="text">Text</option>
                      <option value="image">Image</option>
                    </select>
                    {formData.header_type !== 'none' && <input className="flex-1 bg-white border rounded-lg p-2 text-xs" placeholder={formData.header_type === 'text' ? "Header Text" : "https://image-url..."} value={formData.header} onChange={e => setFormData({...formData, header: e.target.value})} />}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Body Text <span className="text-red-500">*</span></label>
                <textarea className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Hello {{1}}, how can we help today?" value={formData.body} onChange={e => setFormData({...formData, body: e.target.value})} />
              </div>

              {dynamicVars.length > 0 && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2"><Users size={12}/> Variable Mapper</h4>
                    <span className="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-black">PREVIEW ACTIVE</span>
                  </div>
                  {dynamicVars.map((v) => (
                    <div key={v} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-blue-500 w-8">{v}</span>
                        <select 
                          className="flex-1 bg-white border border-blue-200 rounded-lg p-2 text-[10px] font-bold outline-none"
                          value={formData.variables[v] || ""}
                          onChange={(e) => setFormData({
                            ...formData, 
                            variables: { ...formData.variables, [v]: e.target.value }
                          })}
                        >
                          <option value="">Map to Lead Field...</option>
                          <option value="name">Lead Name</option>
                          <option value="wa_number">Phone Number</option>
                          <option value="email">Email</option>
                          <option value="source">Lead Source</option>
                        </select>
                      </div>
                      {formData.variables[v] && (
                        <div className="ml-10 text-[9px] font-bold text-slate-400 italic flex items-center gap-1">
                          <Eye size={10} /> Currently holds: "{previewData[formData.variables[v]] || 'No data'}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(formData.platform_type === 'whatsapp' || formData.platform_type === 'telegram') && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Footer Text</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none" placeholder="Small grey text at bottom..." value={formData.footer} onChange={e => setFormData({...formData, footer: e.target.value})} />
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-200 shrink-0">
            <button onClick={handleSave} disabled={isSaving} className="w-full flex justify-center items-center gap-2 bg-slate-900 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50">
              {isSaving ? "Saving..." : <><Plus size={16} /> Save Template</>}
            </button>
          </div>
        </div>

        {/* Modal */}
        <CampaignSenderModal 
          isOpen={isCampaignModalOpen} 
          onClose={() => setIsCampaignModalOpen(false)} 
          templates={templates} 
        />
        
      </div>
    </DashboardLayout>
  );
}