import { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import { X, Send, Users, Filter, Zap, Clock } from "lucide-react";

interface CampaignSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CampaignSenderModal({ isOpen, onClose, onSuccess }: CampaignSenderModalProps) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    campaignName: "",
    templateId: "",
    leadFilter: { status: "", source: "" },
  });

  useEffect(() => {
    if (isOpen) {
      apiClient.get("/templates").then(res => setTemplates(res.data));
    }
  }, [isOpen]);

  const handleRun = async () => {
    if (!formData.campaignName || !formData.templateId) return alert("Please fill all required fields.");
    
    setLoading(true);
    try {
      await apiClient.post("/templates/trigger-bulk", formData);
      alert("Campaign started successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to start campaign.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Send size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Launch Campaign</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unified Outbound Sender</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-all"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          
          {/* Campaign Name */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Zap size={12} className="text-blue-500" /> Campaign Name
            </label>
            <input 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. March Promo - WhatsApp"
              value={formData.campaignName}
              onChange={e => setFormData({...formData, campaignName: e.target.value})}
            />
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Clock size={12} className="text-purple-500" /> Select Template
            </label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none cursor-pointer"
              value={formData.templateId}
              onChange={e => setFormData({...formData, templateId: e.target.value})}
            >
              <option value="">-- Choose Template --</option>
              {templates.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name} ({t.platform_type})</option>
              ))}
            </select>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* Lead Filters */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
              <Filter size={12} /> Target Audience
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">By Status</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
                  onChange={e => setFormData({...formData, leadFilter: {...formData.leadFilter, status: e.target.value}})}
                >
                  <option value="">All Leads</option>
                  <option value="new">New</option>
                  <option value="engaged">Engaged</option>
                  <option value="qualified">Qualified</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">By Source</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
                  placeholder="e.g. facebook"
                  onChange={e => setFormData({...formData, leadFilter: {...formData.leadFilter, source: e.target.value}})}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">
            Cancel
          </button>
          <button 
            onClick={handleRun}
            disabled={loading}
            className="flex-[2] py-3 px-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Processing..." : <><Zap size={14} fill="currentColor"/> Start Blast</>}
          </button>
        </div>

      </div>
    </div>
  );
}