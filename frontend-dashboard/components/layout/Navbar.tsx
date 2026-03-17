import { useBotStore } from "../../store/botStore";

export default function Navbar() {
  const selectedBotId = useBotStore((s) => s.selectedBotId);

  return (
    <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Context:</span>
        <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
          {selectedBotId || "GlobalView"}
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
          YS
        </div>
      </div>
    </nav>
  );
}