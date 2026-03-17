import React from "react";

interface FlowToolbarProps {
  onAdd: (type: string) => void;
  onSave: () => void;
  onDelete: () => void;
  isSaving: boolean;
  isDirty: boolean;
}

// Categorized for UI/UX clean grouping
const NODE_CATEGORIES = [
  {
    title: "Basic",
    items: [
      { type: "message", label: "Message" },
      { type: "button", label: "Buttons" },
      { type: "list", label: "Menu List" },
      { type: "media", label: "Media" },
    ]
  },
  {
    title: "Logic & Data",
    items: [
      { type: "input", label: "User Input" },
      { type: "condition", label: "Condition" },
      { type: "api", label: "API/Webhook" },
      { type: "delay", label: "Delay" },
    ]
  },
  {
    title: "Advanced",
    items: [
      { type: "wa_flow", label: "WA Form" },
      { type: "product", label: "Product" },
      { type: "handoff", label: "Human Agent" },
    ]
  }
];

export default function FlowToolbar({ onAdd, onSave, onDelete, isSaving, isDirty }: FlowToolbarProps) {
  return (
    <div className="bg-slate-900 text-slate-300 p-4 flex items-center justify-between shadow-md z-10 relative rounded-t-md">
      <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
        {NODE_CATEGORIES.map((category) => (
          <div key={category.title} className="flex items-center gap-2 border-r border-slate-700 pr-6 last:border-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              {category.title}
            </span>
            <div className="flex gap-2">
              {category.items.map((item) => (
                <button
                  key={item.type}
                  onClick={() => onAdd(item.type)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold transition-colors border border-slate-700 hover:border-slate-500 whitespace-nowrap"
                >
                  + {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 ml-4 pl-4 border-l border-slate-700">
        <div className="text-xs text-slate-400 whitespace-nowrap hidden lg:block">
          <span className="font-bold text-white">Hint:</span> Hold <kbd className="bg-slate-800 px-1 py-0.5 rounded border border-slate-700 text-[10px]">Shift</kbd> to multi-select
        </div>
        <button
          onClick={onDelete}
          className="px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-200 rounded text-xs font-bold transition-colors"
        >
          Delete Selected
        </button>
        <button
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className={`px-6 py-2 rounded text-xs font-bold transition-all shadow-lg ${
            isSaving 
            ? "bg-blue-800 text-blue-200 cursor-wait" 
            : isDirty 
              ? "bg-blue-600 text-white hover:bg-blue-500 hover:shadow-blue-500/20" 
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          {isSaving ? "SAVING..." : isDirty ? "SAVE FLOW" : "SAVED"}
        </button>
      </div>
    </div>
  );
}