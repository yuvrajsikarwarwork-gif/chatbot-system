import { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import axios from "axios";

export default function TestMessageModal({ isOpen, onClose, bot }: { isOpen: boolean, onClose: () => void, bot: any }) {
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("text");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !bot) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload: any = { to: phone, type };
      if (type === "template") {
        payload.template = { name: content, language: { code: "en_US" } };
      } else {
        payload.text = content;
      }

      // Calls your newly updated manual test route
      await axios.post("http://localhost:4000/api/send-message", payload);
      alert("✅ Message sent to Meta successfully!");
      onClose();
    } catch (err) {
      alert("❌ Failed to send. Check console.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-black text-slate-900 uppercase tracking-tighter">API Tester</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Phone (with country code)</label>
            <input required type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 916268434155" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500 mt-1" />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500 mt-1">
              <option value="text">Standard Text</option>
              <option value="template">Meta Template</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {type === "template" ? "Template Name" : "Text Body"}
            </label>
            <input required type="text" value={content} onChange={e => setContent(e.target.value)} placeholder={type === "template" ? "e.g. hello_world" : "Hello!"} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500 mt-1" />
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-blue-500 text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs flex justify-center gap-2 hover:bg-blue-600">
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Execute Test
          </button>
        </form>
      </div>
    </div>
  );
}