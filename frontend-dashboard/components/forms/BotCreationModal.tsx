import { useState } from "react";
import { botService } from "../../services/botService";
import { X, Clock, Rocket } from "lucide-react";

interface BotCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BotCreationModal({ isOpen, onClose, onSuccess }: BotCreationModalProps) {
  const [formData, setFormData] = useState({
    bot_name: "",
    wa_phone_number_id: "",
    wa_access_token: "",
    trigger_keywords: "", // NEW FIELD
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await botService.createBot(
        formData.bot_name, 
        formData.wa_phone_number_id, 
        formData.wa_access_token,
        formData.trigger_keywords // Passing to service
      ); 
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Creation failed", err);
      alert("Failed to provision bot. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Provision Agent</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Platform Setup</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-4">
             <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Agent Name</label>
              <input 
                required
                className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 bg-slate-50/50"
                value={formData.bot_name}
                onChange={(e) => setFormData({...formData, bot_name: e.target.value})}
              />
            </div>

            {/* NEW: Keyword Segregation */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Trigger Keywords (Comma Separated)</label>
              <input 
                required
                placeholder="e.g., support, help, sales"
                className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 bg-slate-50/50"
                value={formData.trigger_keywords}
                onChange={(e) => setFormData({...formData, trigger_keywords: e.target.value})}
              />
            </div>

            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Meta Connectivity</span>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Phone Number ID</label>
                <input 
                  required
                  className="w-full border-2 border-white rounded-lg p-2.5 text-xs font-mono outline-none focus:border-blue-400 shadow-sm"
                  value={formData.wa_phone_number_id}
                  onChange={(e) => setFormData({...formData, wa_phone_number_id: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Access Token</label>
                <input 
                  required type="password"
                  className="w-full border-2 border-white rounded-lg p-2.5 text-xs font-mono outline-none focus:border-blue-400 shadow-sm"
                  value={formData.wa_access_token}
                  onChange={(e) => setFormData({...formData, wa_access_token: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border-2 border-slate-100 rounded-xl text-xs font-black text-slate-400">CANCEL</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2">
              {loading ? <Clock size={14} className="animate-spin" /> : <Rocket size={14} />} LAUNCH
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}