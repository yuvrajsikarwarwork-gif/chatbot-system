import { useRouter } from "next/router";
import { 
  PanelLeft, Download, Upload, Undo2, Redo2, 
  Trash2, Save, CheckCircle, LogOut, Clock 
} from "lucide-react";

interface FlowHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  botName?: string;
  botId: string;
  onDownloadSample: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onDeleteSelected: () => void;
  onSave: () => void;
  isDirty: boolean;
  isSaving: boolean;
}

export default function FlowHeader({
  isSidebarOpen, setIsSidebarOpen, botName, botId,
  onDownloadSample, fileInputRef, onFileUpload,
  onUndo, onRedo, canUndo, canRedo,
  onDeleteSelected, onSave, isDirty, isSaving
}: FlowHeaderProps) {
  const router = useRouter();

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50 relative shadow-sm">
      <div className="flex items-center gap-5">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 transition-all">
          <PanelLeft size={20} />
        </button>
        <div className="flex flex-col">
          <span className="font-black text-slate-900 text-[10px] uppercase tracking-widest leading-none">Workspace / {botName || "Unnamed Bot"}</span>
          <span className="font-mono text-slate-400 text-[10px] tracking-tight">id: {botId}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
          <button onClick={onDownloadSample} className="p-2 hover:bg-white rounded-lg transition-all text-blue-600" title="Download Sample JSON">
            <Download size={16} />
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <input type="file" accept=".json" ref={fileInputRef} onChange={onFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white rounded-lg transition-all text-blue-600" title="Import JSON Flow">
            <Upload size={16} />
          </button>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
          <button onClick={onUndo} disabled={!canUndo} className="p-2 hover:bg-white disabled:opacity-20 rounded-lg transition-all text-slate-600"><Undo2 size={16} /></button>
          <button onClick={onRedo} disabled={!canRedo} className="p-2 hover:bg-white disabled:opacity-20 rounded-lg transition-all text-slate-600"><Redo2 size={16} /></button>
        </div>
        <button onClick={onDeleteSelected} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm"><Trash2 size={18} /></button>
        <button onClick={onSave} disabled={!isDirty || isSaving} className={`px-6 py-2.5 text-[11px] font-black rounded-xl flex items-center gap-2 transition-all duration-300 border shadow-lg uppercase tracking-wider ${isSaving ? "bg-blue-600 border-blue-500 text-white animate-pulse" : isDirty ? "bg-slate-900 border-slate-800 text-white hover:bg-black" : "bg-white border-slate-200 text-slate-400 cursor-default shadow-none"}`}>
          {isSaving ? <Clock size={14} className="animate-spin" /> : isDirty ? <Save size={14} /> : <CheckCircle size={14} />}
          {isSaving ? "Saving..." : isDirty ? "Save Changes" : "Saved"}
        </button>
        <button onClick={() => router.push('/bots')} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-200 transition-all border border-slate-200"><LogOut size={18} /></button>
      </div>
    </div>
  );
}