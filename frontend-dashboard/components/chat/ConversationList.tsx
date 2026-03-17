import React from "react";
import { Clock, Bot } from "lucide-react";
import { Conversation } from "../../services/messageService";

interface ConversationListProps {
  list: Conversation[];
  activeId?: string | number;
  onSelect: (c: Conversation) => void;
}

export default function ConversationList({ list, activeId, onSelect }: ConversationListProps) {
  return (
    <div className="w-80 border-r border-slate-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center shrink-0">
        <h2 className="font-black uppercase tracking-widest text-sm">Live Inbox</h2>
        <div className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
          {list.filter(c => c.human_active).length} Waiting
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
        {list.length === 0 ? (
          <div className="p-6 text-sm text-slate-400 font-bold text-center">
            No conversations found.
          </div>
        ) : (
          list.map((c) => (
            <div
              key={c.id}
              className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-white ${
                activeId === c.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
              }`}
              onClick={() => onSelect(c)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-slate-800 text-sm truncate">
                  {c.wa_name || c.user_identifier}
                </span>
                {c.human_active ? (
                  <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase whitespace-nowrap">
                    <Clock size={10} /> Agent Needed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase whitespace-nowrap">
                    <Bot size={10} /> Bot Active
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 font-mono truncate block">
                {c.user_identifier}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}