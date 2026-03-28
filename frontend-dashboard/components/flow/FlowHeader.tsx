import { 
  PanelLeft, Download, Upload, Undo2, Redo2, 
  Trash2, Save, CheckCircle, LogOut, Clock, Copy, ClipboardPaste, Pencil
} from "lucide-react";

interface FlowHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  botName?: string;
  botId: string;
  canEditWorkflow: boolean;
  canDeleteFlowAction: boolean;
  flowSummaries: Array<{ id: string; flow_name?: string; is_default?: boolean }>;
  currentFlowId: string | null;
  currentFlowName: string;
  onSelectFlow: (flowId: string) => void;
  onCreateFlow: () => void;
  onEditFlowName: () => void;
  onDownloadSample: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onDeleteSelected: () => void;
  onCopySelected: () => void;
  onPasteSelected: () => void;
  onDeleteFlow: () => void;
  onSave: () => void;
  onCloseBuilder: () => void;
  isDirty: boolean;
  isSaving: boolean;
  canDeleteFlow: boolean;
  canPasteSelection: boolean;
}

export default function FlowHeader({
  isSidebarOpen, setIsSidebarOpen, botName, botId,
  canEditWorkflow, canDeleteFlowAction,
  flowSummaries, currentFlowId, currentFlowName, onSelectFlow, onCreateFlow, onEditFlowName,
  onDownloadSample, fileInputRef, onFileUpload,
  onUndo, onRedo, canUndo, canRedo,
  onDeleteSelected, onCopySelected, onPasteSelected, onDeleteFlow, onSave, onCloseBuilder, isDirty, isSaving, canDeleteFlow, canPasteSelection
}: FlowHeaderProps) {
  return (
    <div className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0 z-50 relative shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-5">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-background border border-border rounded-lg text-muted hover:bg-primary-fade hover:text-primary hover:border-primary/30 transition-all">
          <PanelLeft size={20} />
        </button>
        <div className="flex flex-col">
          <span className="font-black text-foreground text-[10px] uppercase tracking-widest leading-none">Workspace / {botName || "Unnamed Bot"}</span>
          <span className="font-mono text-muted text-[10px] tracking-tight">id: {botId}</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={currentFlowId || ""}
            onChange={(event) => onSelectFlow(event.target.value)}
            className="min-w-[220px] rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none"
          >
            <option value="">Select flow</option>
            {flowSummaries.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.flow_name || "Untitled flow"}{flow.is_default ? " · Default" : ""}
              </option>
            ))}
          </select>
          {canEditWorkflow ? (
            <button
              onClick={onCreateFlow}
              className="rounded-xl border border-border bg-transparent px-3 py-2 text-[10px] font-black uppercase tracking-wider text-foreground transition hover:bg-primary-fade hover:text-primary hover:border-primary/30"
            >
              New Flow
            </button>
          ) : null}
          {currentFlowId ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
              <span className="max-w-[220px] truncate text-xs font-semibold text-foreground">
                {currentFlowName || "Untitled flow"}
              </span>
              {canEditWorkflow ? (
                <button
                  type="button"
                  onClick={onEditFlowName}
                  className="rounded-lg p-1 text-muted transition hover:bg-primary-fade hover:text-primary"
                  title="Edit flow name"
                >
                  <Pencil size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
          <button onClick={onDownloadSample} className="p-2 hover:bg-primary-fade rounded-lg transition-all text-primary" title="Download Sample JSON">
            <Download size={16} />
          </button>
          {canEditWorkflow ? (
            <>
              <div className="w-px h-4 bg-slate-300 mx-1"></div>
              <input type="file" accept=".json" ref={fileInputRef} onChange={onFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-primary-fade rounded-lg transition-all text-primary" title="Import JSON Flow">
                <Upload size={16} />
              </button>
            </>
          ) : null}
        </div>
        {canEditWorkflow ? (
          <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
            <button onClick={onUndo} disabled={!canUndo} className="p-2 hover:bg-primary-fade disabled:opacity-20 rounded-lg transition-all text-muted"><Undo2 size={16} /></button>
            <button onClick={onRedo} disabled={!canRedo} className="p-2 hover:bg-primary-fade disabled:opacity-20 rounded-lg transition-all text-muted"><Redo2 size={16} /></button>
            <div className="w-px h-4 bg-border mx-1"></div>
            <button onClick={onCopySelected} className="p-2 hover:bg-primary-fade rounded-lg transition-all text-muted" title="Copy selected nodes"><Copy size={16} /></button>
            <button onClick={onPasteSelected} disabled={!canPasteSelection} className="p-2 hover:bg-primary-fade disabled:opacity-20 rounded-lg transition-all text-muted" title="Paste copied nodes"><ClipboardPaste size={16} /></button>
          </div>
        ) : null}
        {canEditWorkflow || (canDeleteFlow && canDeleteFlowAction) ? (
          <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
            {canEditWorkflow ? (
              <button
                onClick={onDeleteSelected}
                className="p-2.5 bg-transparent text-foreground rounded-lg hover:bg-primary-fade hover:text-primary transition-all border border-border"
                title="Delete selected nodes or edges"
              >
                <Trash2 size={18} />
              </button>
            ) : null}
            {canDeleteFlow && canDeleteFlowAction ? (
              <button
                onClick={onDeleteFlow}
                className="px-3 py-2.5 bg-transparent text-foreground rounded-lg hover:bg-primary-fade hover:text-primary transition-all border border-border text-[10px] font-black uppercase tracking-wider"
                title="Delete current workflow"
              >
                Remove Flow
              </button>
            ) : null}
          </div>
        ) : null}
        {canEditWorkflow ? (
          <button onClick={onSave} disabled={!isDirty || isSaving} className={`px-6 py-2.5 text-[11px] font-black rounded-xl flex items-center gap-2 transition-all duration-300 border uppercase tracking-wider ${isSaving ? "bg-primary border-primary text-white animate-pulse" : isDirty ? "bg-primary border-primary text-white hover:opacity-95" : "bg-background border-border text-muted cursor-default shadow-none"}`}>
            {isSaving ? <Clock size={14} className="animate-spin" /> : isDirty ? <Save size={14} /> : <CheckCircle size={14} />}
            {isSaving ? "Saving..." : isDirty ? "Save Changes" : "Saved"}
          </button>
        ) : (
          <div className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Read Only
          </div>
        )}
        <button
          onClick={onCloseBuilder}
          className="p-2.5 bg-transparent text-muted rounded-xl hover:bg-primary-fade hover:text-primary transition-all border border-border"
          title="Save and close builder"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
