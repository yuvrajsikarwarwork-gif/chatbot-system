import React, { useEffect, useRef } from "react";
import { Message } from "../../services/messageService";

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm font-bold">
        No messages in this conversation yet.
      </div>
    );
  }

  return (
    <div className="absolute inset-0 p-6 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
      <div className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">
        Conversation Started
      </div>

      {messages.map((m) => {
        const sender = m.sender?.toLowerCase() || "user";
        const isBot = sender === "bot";
        const isAgent = sender === "agent";
        const isSystem = isBot || isAgent;

        return (
          <div 
            key={m.id} 
            className={`flex w-full ${isSystem ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex flex-col max-w-[70%]`}>
              <div 
                className={`p-3 rounded-2xl shadow-sm text-sm ${
                  isAgent 
                    ? "bg-blue-600 text-white rounded-br-none" 
                    : isBot 
                    ? "bg-slate-800 text-white rounded-br-none" 
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                }`}
              >
                {m.message || m.text}
              </div>
              <span className={`text-[9px] mt-1 font-bold uppercase tracking-widest opacity-70 ${isSystem ? "text-right text-slate-500" : "text-left text-slate-500"}`}>
                {sender}
              </span>
            </div>
          </div>
        );
      })}
      <div ref={scrollRef} />
    </div>
  );
}