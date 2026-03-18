import React from 'react';
import { User, Bot } from 'lucide-react';

interface Props {
  list: any[];
  activeId?: number;
  onSelect: (convo: any) => void;
}

export default function ConversationList({ list, activeId, onSelect }: Props) {
  // Extra safety net so .filter doesn't crash if list is undefined
  const safeList = Array.isArray(list) ? list : [];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
        <h2 className="font-black uppercase tracking-widest text-sm">Live Inbox</h2>
        <div className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
          {safeList.filter(c => c.human_active).length} Waiting
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {safeList.map(convo => (
          <button
            key={convo.id}
            onClick={() => onSelect(convo)}
            className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-100 transition-colors flex items-center gap-3 ${activeId === convo.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'bg-white'}`}
          >
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 shrink-0">
              <User size={18} />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="font-bold text-slate-800 text-sm truncate">
                {convo.wa_name || convo.wa_number}
              </div>
              <div className="text-xs mt-1 flex items-center gap-1">
                {convo.human_active ? (
                  <span className="text-red-500 font-bold flex items-center gap-1"><User size={10}/> Human Mode</span>
                ) : (
                  <span className="text-blue-500 font-bold flex items-center gap-1"><Bot size={10}/> Bot Active</span>
                )}
              </div>
            </div>
          </button>
        ))}
        {safeList.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
            No active chats
          </div>
        )}
      </div>
    </div>
  );
}