import { useEffect, useState } from "react";
import { X, Loader2, Save, Info } from "lucide-react";

import { botService } from "../../services/botService";
import { projectService, type ProjectSummary } from "../../services/projectService";
import { notify } from "../../store/uiStore";
import { useAuthStore } from "../../store/authStore";

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
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const activeProject = useAuthStore((state) => state.activeProject);
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (bot && isOpen) {
      setName(bot.name || "");
      setKeywords(bot.trigger_keywords || "");
      setProjectId(bot.project_id ?? "");
    }
  }, [bot, isOpen]);

  useEffect(() => {
    if (!isOpen || !activeWorkspace?.workspace_id) {
      setProjects([]);
      return;
    }

    projectService
      .list(activeWorkspace.workspace_id)
      .then((rows) => setProjects(rows))
      .catch((err) => {
        console.error("Failed to load projects for bot editor", err);
        setProjects([]);
      });
  }, [isOpen, activeWorkspace?.workspace_id]);

  if (!isOpen || !bot) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);

    try {
      await botService.updateBot(bot.id, {
        name,
        trigger_keywords: keywords,
        workspaceId: activeWorkspace?.workspace_id || bot.workspace_id || null,
        projectId: projectId || null,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Update failed", err);
      notify("Failed to update bot settings.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 max-h-[70vh] w-full max-w-lg overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border bg-card p-6">
          <div>
            <h2 className="font-black uppercase tracking-tighter text-foreground">
              Edit Instance
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              ID: {bot.id}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-primary-fade"
          >
            <X size={20} className="text-muted" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[70vh] space-y-5 overflow-y-auto p-8"
        >
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted">
              Instance Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-5 py-3 text-sm font-bold text-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted">
              Trigger Keywords
            </label>

            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-5 py-3 text-sm font-bold text-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-5 py-3 text-sm font-bold text-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary-fade p-4">
            <Info className="shrink-0 text-primary" size={18} />

            <p className="text-[10px] font-medium text-foreground">
              Platform credentials now belong to campaign channels. Editing a bot
              changes reusable logic metadata and its project attachment.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-xs font-black uppercase tracking-widest text-white transition-opacity hover:opacity-90"
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
