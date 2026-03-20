// frontend-dashboard/components/flow/NodeEditor.tsx

import { Node } from "reactflow";
import { useState } from "react";
import apiClient from "../../services/apiClient";
import { RotateCcw, Link, Headset, Bot, LayoutTemplate } from "lucide-react";

interface NodeEditorProps {
  node: Node | null;
  onUpdate: (data: any) => void;
  onClose: () => void;
}

export default function NodeEditor({ node, onUpdate, onClose }: NodeEditorProps) {
  const [isUploading, setIsUploading] = useState(false);

  if (!node) return null;

  const updateData = (key: string, value: any) => {
    onUpdate({ ...node.data, [key]: value });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let fileToUpload = file;

      if (file.type.startsWith('image/')) {
        fileToUpload = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 1024;
              let width = img.width;
              let height = img.height;

              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              
              canvas.toBlob((blob) => {
                if (blob) resolve(new File([blob], file.name, { type: file.type }));
                else resolve(file); 
              }, file.type, 0.7); 
            };
          };
        });
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const response = await apiClient.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (response.data?.url) updateData('media_url', response.data.url);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  /* =====================================================================
     SHARED LOGIC (For Inputs and Menus)
  ===================================================================== */
  
  const RenderTimeoutAndRetryLogic = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">On Invalid Message</label>
        <textarea className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs resize-none h-12" placeholder="Invalid format/selection. Please try again." value={node.data.onInvalidMessage || ""} onChange={(e) => updateData('onInvalidMessage', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Retries</label>
          <input type="number" className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs" placeholder="3" value={node.data.maxRetries || ""} onChange={(e) => updateData('maxRetries', Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Error Node ID</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="error1" value={node.data.errorNode || ""} onChange={(e) => updateData('errorNode', e.target.value)} />
        </div>
      </div>

      <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 space-y-3">
        <div className="flex items-center gap-1 mb-1">
          <RotateCcw size={12} className="text-amber-600" />
          <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Inactivity & Timeout</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[8px] font-black text-amber-600 uppercase mb-1">Reminder Delay (Sec)</label>
            <input type="number" className="w-full border-none bg-white rounded p-2 text-xs" placeholder="300" value={node.data.reminderDelay || ""} onChange={(e) => updateData('reminderDelay', Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-[8px] font-black text-amber-600 uppercase mb-1">Timeout (Sec)</label>
            <input type="number" className="w-full border-none bg-white rounded p-2 text-xs" placeholder="900" value={node.data.timeout || ""} onChange={(e) => updateData('timeout', Number(e.target.value))} />
          </div>
        </div>
        <textarea className="w-full border-none bg-white rounded p-2 text-xs resize-none h-12" placeholder="Reminder text..." value={node.data.reminderText || ""} onChange={(e) => updateData('reminderText', e.target.value)} />
        <textarea className="w-full border-none bg-white rounded p-2 text-xs resize-none h-12" placeholder="Fallback text if Timeout Node is missing..." value={node.data.timeoutFallback || ""} onChange={(e) => updateData('timeoutFallback', e.target.value)} />
      </div>
    </div>
  );

  /* =====================================================================
     NODE-SPECIFIC RENDER COMPONENTS
  ===================================================================== */

  const RenderMenuOptionsNode = (maxOptions: number, label: string) => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="space-y-2">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}s (Max {maxOptions})</label>
        {Array.from({ length: maxOptions }).map((_, i) => {
          const num = i + 1;
          return (
            <input 
              key={num}
              className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg p-2.5 text-xs font-medium focus:border-blue-500 outline-none transition-all" 
              placeholder={`${label} ${num}`}
              value={node.data[`item${num}`] || ""} 
              onChange={(e) => updateData(`item${num}`, e.target.value)}
            />
          );
        })}
      </div>
      {RenderTimeoutAndRetryLogic()}
    </div>
  );

  const RenderInputNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
        <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">Variable Name</label>
        <input className="w-full border border-white bg-white rounded p-2 text-xs font-mono" placeholder="e.g. user_email" value={node.data.variable || ""} onChange={(e) => updateData('variable', e.target.value)} />
      </div>

      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Validation Type</label>
        <select className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-medium outline-none" value={node.data.validation || "text"} onChange={(e) => updateData('validation', e.target.value)}>
          <option value="text">Text / Any</option>
          <option value="email">Email</option>
          <option value="phone">Phone Number</option>
          <option value="number">Numeric</option>
          <option value="date">Date</option>
          <option value="regex">Custom Regex</option>
        </select>
      </div>

      {node.data.validation === 'regex' && (
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Regex Pattern</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="e.g. ^[A-Z]{3}$" value={node.data.regex || ""} onChange={(e) => updateData('regex', e.target.value)} />
        </div>
      )}

      {RenderTimeoutAndRetryLogic()}
    </div>
  );

  const RenderTriggerNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Keywords</label>
        <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-medium" placeholder="e.g. hi, hello, start" value={node.data.keywords || ""} onChange={(e) => updateData('keywords', e.target.value)} />
      </div>
    </div>
  );

  const RenderTemplateNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Template Name</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="e.g. welcome_msg" value={node.data.templateName || ""} onChange={(e) => updateData('templateName', e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Language</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="en_US" value={node.data.language || ""} onChange={(e) => updateData('language', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Variables (CSV)</label>
        <textarea className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs resize-none h-16" placeholder='e.g. {{name}}, {{company}}' value={node.data.variables || ""} onChange={(e) => updateData('variables', e.target.value)} />
      </div>
    </div>
  );

  const RenderMediaNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Media Target</label>
        <div className="flex gap-2 mb-2">
          <input className="flex-1 border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="https://..." value={node.data.media_url || node.data.url || ""} onChange={(e) => updateData('media_url', e.target.value)} />
          <label className="bg-blue-50 border border-blue-100 text-blue-600 px-3 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-100 flex items-center justify-center transition-all min-w-[70px]">
            {isUploading ? "..." : "Upload"}
            <input type="file" accept="image/*,video/*,application/pdf" className="hidden" onChange={handleMediaUpload} disabled={isUploading} />
          </label>
        </div>
      </div>
    </div>
  );

  const RenderGotoNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
        <button onClick={() => updateData('gotoType', 'node')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${node.data.gotoType !== 'bot' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Internal Node</button>
        <button onClick={() => updateData('gotoType', 'bot')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${node.data.gotoType === 'bot' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>External Bot</button>
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
          {node.data.gotoType === 'bot' ? 'Target Bot ID' : 'Target Node ID'}
        </label>
        <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder={node.data.gotoType === 'bot' ? "bot_1" : "n_123"} value={node.data.targetNode || node.data.targetBotId || ""} onChange={(e) => updateData(node.data.gotoType === 'bot' ? 'targetBotId' : 'targetNode', e.target.value)} />
      </div>
    </div>
  );

  const RenderConditionNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Variable to Check</label>
        <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="e.g. user_email" value={node.data.variable || ""} onChange={(e) => updateData('variable', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Operator</label>
          <select className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs outline-none" value={node.data.operator || "equals"} onChange={(e) => updateData('operator', e.target.value)}>
            <option value="equals">Equals</option>
            <option value="contains">Contains</option>
            <option value="exists">Exists</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Value</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs" placeholder="e.g. test@gmail.com" value={node.data.value || ""} onChange={(e) => updateData('value', e.target.value)} />
        </div>
      </div>
    </div>
  );

  const RenderSaveNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Variable</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="e.g. session_val" value={node.data.variable || ""} onChange={(e) => updateData('variable', e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lead DB Field</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="e.g. name, email" value={node.data.leadField || node.data.field || ""} onChange={(e) => updateData('leadField', e.target.value)} />
        </div>
      </div>
    </div>
  );

  const renderSpecificNodeFields = () => {
    switch (node.type) {
      case 'input': return <RenderInputNode />;
      case 'menu_button': return RenderMenuOptionsNode(4, "Button");
      case 'menu_list': return RenderMenuOptionsNode(10, "List Item");
      case 'trigger': return <RenderTriggerNode />;
      case 'send_template': return <RenderTemplateNode />;
      case 'msg_media': return <RenderMediaNode />;
      case 'goto': return <RenderGotoNode />;
      case 'condition': return <RenderConditionNode />;
      case 'save': return <RenderSaveNode />;
      default: return null;
    }
  };

  return (
    <div 
      className="w-full h-full bg-white flex flex-col relative overflow-hidden nodrag nopan" 
      onKeyDownCapture={(e) => e.stopPropagation()}
      onKeyUpCapture={(e) => e.stopPropagation()}
    >
      <div className="flex-1 overflow-y-auto p-5 pb-6 custom-scrollbar">
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Node Header (Label)</label>
            <input 
              className="w-full border-2 border-slate-200 bg-slate-50 focus:bg-white rounded-xl p-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
              placeholder="e.g. Greeting"
              value={node.data.label || ""}
              onChange={(e) => updateData('label', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Message Text / Notes</label>
            <textarea 
              className="w-full border-2 border-slate-200 bg-slate-50 focus:bg-white rounded-xl p-3 text-sm min-h-[100px] resize-none focus:border-blue-500 outline-none transition-all"
              placeholder="Content..."
              value={node.data.text || ""}
              onChange={(e) => updateData('text', e.target.value)}
            />
          </div>
        </div>
        {renderSpecificNodeFields()}
      </div>
      <div className="w-full p-4 border-t border-slate-200 bg-white shrink-0 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)] z-10">
        <button onClick={onClose} className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
          Save & Close
        </button>
      </div>
    </div>
  );
}