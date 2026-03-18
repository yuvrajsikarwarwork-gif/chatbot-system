import React, { useState, useEffect } from "react";
import { X, Send, Users, CheckCircle2, Loader2 } from "lucide-react";
import apiClient from "../../services/apiClient";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  templates: any[];
}

export default function CampaignSenderModal({ isOpen, onClose, templates }: Props) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLeads();
      setStep(1);
      setResult(null);
    }
  }, [isOpen]);

  const fetchLeads = async () => {
    try {
      const res = await apiClient.get("/leads");
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch leads");
    }
  };

  const handleLaunch = async () => {
    if (!selectedTemplate || selectedLeads.length === 0) return;
    setIsSending(true);
    try {
      const res = await apiClient.post("/templates/launch-campaign", {
        templateId: selectedTemplate.id,
        leadIds: selectedLeads,
        campaignName: `Manual Blast - ${new Date().toLocaleDateString()}`
      });
      setResult(res.data);
      setStep(3);
    } catch (err) {
      alert("Campaign launch failed.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Launch Bulk Campaign</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase"><Send size={18} className="text-blue-500"/> Select Template</h3>
              <div className="grid grid-cols-1 gap-3">
                {templates.filter(t => t.status === 'approved').map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => { setSelectedTemplate(t); setStep(2); }}
                    className="p-4 border-2 border-slate-100 rounded-2xl text-left hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <div className="font-bold text-slate-900">{t.name}</div>
                    <div className="text-xs text-slate-500 line-clamp-1">{t.body}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase"><Users size={18} className="text-blue-500"/> Select Recipients</h3>
                <button 
                  onClick={() => setSelectedLeads(leads.map(l => l.id))}
                  className="text-[10px] font-black text-blue-600 uppercase border-b-2 border-blue-600"
                >
                  Select All ({leads.length})
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {leads.map(lead => (
                  <label key={lead.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedLeads.includes(lead.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedLeads([...selectedLeads, lead.id]);
                        else setSelectedLeads(selectedLeads.filter(id => id !== lead.id));
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                        <div className="text-sm font-bold text-slate-800">{lead.wa_name || 'Unknown'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{lead.wa_number}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 3 && result && (
            <div className="text-center py-12 space-y-4 animate-in zoom-in-95 duration-300">
              <div className="inline-flex p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase">Campaign Launched!</h3>
              <div className="flex justify-center gap-8 mt-6">
                 <div className="text-center">
                    <div className="text-2xl font-black text-blue-600">{result.successCount}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase">Successful</div>
                 </div>
                 <div className="text-center">
                    <div className="text-2xl font-black text-red-500">{result.failCount}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase">Failed</div>
                 </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
          {step > 1 && step < 3 && (
            <button onClick={() => setStep(step - 1)} className="px-6 py-3 font-black text-xs uppercase text-slate-500 hover:text-slate-800">Back</button>
          )}
          <div className="flex-1" />
          {step === 2 && (
            <button 
              disabled={selectedLeads.length === 0 || isSending}
              onClick={handleLaunch}
              className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
            >
              {isSending ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>}
              Launch Blast
            </button>
          )}
          {step === 3 && (
            <button onClick={onClose} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest w-full">Done</button>
          )}
        </div>
      </div>
    </div>
  );
}