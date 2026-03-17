import { useState, useEffect } from "react";
import { X, Loader2, Save, Info } from "lucide-react";
import { botService } from "../../services/botService";

interface EditBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: any;
  onSuccess: () => void;
}

export default function EditBotModal({
  isOpen,
  onClose,
  bot,
  onSuccess,
}: EditBotModalProps) {
  const [name, setName] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [keywords, setKeywords] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (bot && isOpen) {
      setName(bot.name || "");
      setPhoneNumberId(bot.wa_phone_number_id || "");
      setAccessToken(bot.wa_access_token || "");
      setKeywords(bot.trigger_keywords || "");
    }
  }, [bot, isOpen]);

  if (!isOpen || !bot) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);

    try {
      // ✅ FIX — send ALL fields in one call
      await botService.updateBot(bot.id, {
        name: name,
        wa_phone_number_id: phoneNumberId,
        wa_access_token: accessToken,
        trigger_keywords: keywords,
      });

      onSuccess();
      onClose();

    } catch (err) {
      console.error("Update failed", err);
      alert("Failed to update bot settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="font-black text-slate-900 uppercase tracking-tighter">
              Edit Instance
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              ID: {bot.id}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-5 overflow-y-auto max-h-[70vh]"
        >
          {/* Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Instance Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Phone Number ID
            </label>

            <input
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-mono focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Token */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Access Token
            </label>

            <textarea
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-mono focus:border-blue-500 outline-none transition-all h-20"
            />
          </div>

          {/* Keywords */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Trigger Keywords
            </label>

            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
            <Info className="text-amber-500 shrink-0" size={18} />

            <p className="text-[10px] text-amber-700 font-medium">
              Updating WhatsApp credentials will affect live flows.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}

            {isSaving ? "Applying Changes..." : "Save Bot Configuration"}
          </button>
        </form>
      </div>
    </div>
  );
}