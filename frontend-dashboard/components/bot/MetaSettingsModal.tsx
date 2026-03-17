import { useState } from "react";
import { X, Save, Key, Phone, ShieldCheck } from "lucide-react";
import { botService } from "../../services/botService";

interface MetaSettingsProps {
  botId: string;
  onClose: () => void;
}

export default function MetaSettingsModal({ botId, onClose }: MetaSettingsProps) {
  const [phoneId, setPhoneId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("my_super_secret_verify_token_123"); // Default or generated
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await botService.updateCredentials(botId, {
        wa_phone_number_id: phoneId,
        wa_access_token: accessToken,
        wa_verify_token: verifyToken,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save credentials", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="bg-slate-900 p-5 flex items-center justify-between">
          <h2 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
            <ShieldCheck className="text-emerald-400" size={18} />
            Meta API Configuration
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
              <Phone size={12} /> Phone Number ID
            </label>
            <input 
              type="text" 
              placeholder="e.g. 104598213840"
              value={phoneId} 
              onChange={(e) => setPhoneId(e.target.value)} 
              className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-[10px] text-slate-400 mt-1">Found in your Meta App Dashboard under WhatsApp &gt; API Setup.</p>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
              <Key size={12} /> Permanent Access Token
            </label>
            <input 
              type="password" 
              placeholder="EAA..."
              value={accessToken} 
              onChange={(e) => setAccessToken(e.target.value)} 
              className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
              <ShieldCheck size={12} /> Custom Verify Token
            </label>
            <input 
              type="text" 
              value={verifyToken} 
              onChange={(e) => setVerifyToken(e.target.value)} 
              className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors bg-slate-50"
            />
            <p className="text-[10px] text-slate-400 mt-1">Paste this exact string into Meta when configuring your Webhook.</p>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50">
          <button 
            onClick={handleSave} 
            disabled={isSaving || !phoneId || !accessToken}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
          >
            {isSaving ? "SAVING..." : <><Save size={16} /> SAVE CREDENTIALS</>}
          </button>
        </div>

      </div>
    </div>
  );
}