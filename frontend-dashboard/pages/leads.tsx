import { useState, useEffect } from "react";
import apiClient from "../services/apiClient";
import DashboardLayout from "../components/layout/DashboardLayout";
import { 
  User, Phone, Search, Filter, Download, Trash2, Mail, Globe, 
  Tag, MessageSquare, Zap, X, Briefcase, FileText, Activity, Send, Database, 
  ShieldCheck, ShieldAlert, Timer, CheckCircle2
} from "lucide-react";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // States for Panels and Modals
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isSendTemplateModalOpen, setIsSendTemplateModalOpen] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchTemplates();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await apiClient.get("/leads");
      setLeads(res.data);
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await apiClient.get("/templates?platform=whatsapp");
      setTemplates(res.data);
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
  };

  const handleSendSingleTemplate = async (templateId: string) => {
    if (!selectedLead) return;
    setSendingTemplate(true);
    try {
      await apiClient.post("/templates/trigger-bulk", {
        campaignName: `Direct Send: ${selectedLead.wa_name}`,
        templateId,
        leadFilter: { id: selectedLead.id } // Backend should handle single ID filter
      });
      alert("Template sent successfully!");
      setIsSendTemplateModalOpen(false);
    } catch (err) {
      alert("Failed to send template. Ensure it is approved by Meta.");
    } finally {
      setSendingTemplate(false);
    }
  };

  const filteredLeads = leads.filter((lead: any) => 
    lead.wa_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.wa_number?.includes(searchTerm) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.platform?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(lead.variables).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'new': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'engaged': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'qualified': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'closed': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F8FAFC] p-8 flex relative overflow-hidden">
        <div className={`transition-all duration-300 ${selectedLead ? 'w-[calc(100%-400px)] pr-8' : 'w-full max-w-7xl mx-auto'}`}>
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Leads Database</h1>
              <p className="text-slate-500 text-sm">Manage, engage, and export data captured from your multi-platform automation flows.</p>
            </div>
            <button className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg shadow-slate-200">
              <Download size={18} /> Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search leads..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
              <Filter size={18} /> Filters
            </button>
          </div>

          {/* Leads Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">User</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Platform</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead: any) => (
                  <tr 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold uppercase">
                          {lead.wa_name?.[0] || "?"}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{lead.wa_name || "Unknown"}</span>
                          <span className="text-slate-500 text-xs">{lead.wa_number}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                        <Globe size={12} className="text-slate-400" /> {lead.platform || 'whatsapp'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border ${getStatusColor(lead.status || 'new')}`}>
                        {lead.status || 'New'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                      {new Date(lead.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================================
            LEAD DETAILS SIDE PANEL
        ============================================= */}
        <div className={`fixed top-0 right-0 h-full w-[400px] bg-white border-l border-slate-200 shadow-2xl transition-transform duration-300 z-50 flex flex-col ${selectedLead ? 'translate-x-0' : 'translate-x-full'}`}>
          {selectedLead && (
            <>
              <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-black uppercase">
                    {selectedLead.wa_name?.[0]}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{selectedLead.wa_name}</h2>
                    <p className="text-xs font-bold text-slate-500">{selectedLead.wa_number}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedLead(null)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Meta Data */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><User size={12}/> Meta Info</h3>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-slate-500">Email:</span> <span className="font-bold">{selectedLead.email || 'N/A'}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-slate-500">Source:</span> <span className="font-bold uppercase">{selectedLead.source || 'Organic'}</span></div>
                  </div>
                </div>

                {/* Variables */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Database size={12}/> Variable Data</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedLead.variables || {}).map(([key, val]: any) => (
                      <div key={key} className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1">{key}</div>
                        <div className="text-xs font-bold text-slate-800 truncate">{String(val)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><FileText size={12}/> Internal Notes</h3>
                  <textarea className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Add notes..." defaultValue={selectedLead.notes} />
                </div>
              </div>

              <div className="p-6 bg-white border-t border-slate-200 space-y-3">
                <button 
                  onClick={() => setIsSendTemplateModalOpen(true)}
                  className="w-full flex justify-center items-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                >
                  <Send size={14} /> Send WhatsApp Template
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex justify-center items-center gap-2 bg-blue-50 text-blue-600 border border-blue-100 py-3 rounded-xl font-black text-[10px] uppercase transition-all"><Zap size={14} /> Trigger Flow</button>
                  <button className="flex justify-center items-center gap-2 bg-slate-50 text-slate-600 border border-slate-200 py-3 rounded-xl font-black text-[10px] uppercase transition-all"><MessageSquare size={14} /> Direct Message</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* =========================================
            SEND TEMPLATE MODAL
        ============================================= */}
        {isSendTemplateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Select Approved Template</h3>
                <button onClick={() => setIsSendTemplateModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-all"><X size={18} /></button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[400px] space-y-3 custom-scrollbar">
                {templates.filter((t: any) => t.status === 'approved').length > 0 ? (
                  templates.filter((t: any) => t.status === 'approved').map((t: any) => (
                    <button 
                      key={t.id}
                      onClick={() => handleSendSingleTemplate(t.id)}
                      disabled={sendingTemplate}
                      className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all flex justify-between items-center group"
                    >
                      <div>
                        <div className="text-sm font-black text-slate-900 group-hover:text-blue-600">{t.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">{t.category}</div>
                      </div>
                      <CheckCircle2 size={18} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center space-y-2">
                    <ShieldAlert size={32} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-500 italic">No approved templates found. Templates must be approved by Meta before they can be sent.</p>
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                 <button onClick={() => setIsSendTemplateModalOpen(false)} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest">Close</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}