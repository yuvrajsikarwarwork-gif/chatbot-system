import { Handle, Position } from "reactflow";
import { MessageSquareDashed } from "lucide-react";

export default function TemplateNode({ data }: { data: any }) {
  return (
    <div className="bg-white border-2 border-indigo-200 rounded-2xl shadow-xl w-64 overflow-hidden">
      <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex items-center gap-2">
        <MessageSquareDashed size={14} className="text-indigo-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Template Message</span>
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Template Name</label>
          <input 
            className="w-full text-xs font-mono bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 mt-1 outline-none focus:border-indigo-400"
            defaultValue={data.templateName || "hello_world"}
            onChange={(e) => data.onChange?.("templateName", e.target.value)}
            placeholder="e.g. hello_world"
          />
        </div>
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Language Code</label>
          <input 
            className="w-full text-xs font-mono bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 mt-1 outline-none focus:border-indigo-400"
            defaultValue={data.languageCode || "en_US"}
            onChange={(e) => data.onChange?.("languageCode", e.target.value)}
          />
        </div>
      </div>

      <Handle type="target" position={Position.Top} className="w-3 h-3 border-2 bg-white border-indigo-400" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 border-2 bg-white border-indigo-400" />
    </div>
  );
}