import React, { useEffect, useRef } from "react";

interface MessageListProps {
  messages: any[]; 
}

export default function MessageList({ messages }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // ✅ New helper to parse and safely render the standardized JSON content
  const renderMessageContent = (msg: any, isSystem: boolean) => {
    let payload: any = {};
    
    // Parse DB content if it's a string, or use directly if it's an object
    if (msg.content) {
      payload = typeof msg.content === "string" ? JSON.parse(msg.content) : msg.content;
    } else {
      payload = { type: "text", text: msg.message || msg.text || "" };
    }

    if (payload.type === "template" && payload.templateContent) {
      const tpl = typeof payload.templateContent === "string" ? JSON.parse(payload.templateContent) : payload.templateContent;
      return (
        <div className="flex flex-col gap-1">
          {tpl.header?.text && <div className="font-bold text-[13px] border-b border-current/20 pb-1 mb-1">{tpl.header.text}</div>}
          <div className="whitespace-pre-wrap">{tpl.body || payload.text}</div>
          {tpl.footer && <div className="text-[11px] opacity-70 mt-1">{tpl.footer}</div>}
          {tpl.buttons && tpl.buttons.length > 0 && (
            <div className="flex flex-col gap-1 mt-2">
              {tpl.buttons.map((b: any, i: number) => (
                <div key={i} className="bg-current/10 text-center py-1.5 px-3 rounded text-xs font-semibold">
                  {b.title || b.text || "Action"}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (payload.type === "interactive" && payload.buttons) {
      return (
        <div className="flex flex-col gap-1">
          <div className="whitespace-pre-wrap">{payload.text}</div>
          <div className="flex flex-col gap-1 mt-2">
            {payload.buttons.map((b: any, i: number) => (
              <div key={i} className="bg-current/10 text-center py-1.5 px-3 rounded text-xs font-semibold">
                {b.title || b.text || "Option"}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Default Fallback
    return <div className="whitespace-pre-wrap">{payload.text || "[Unsupported Format]"}</div>;
  };

  return (
    <div className="absolute inset-0 p-6 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
      <div className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">
        Conversation Started
      </div>

      {messages.map((m, index) => {
        const sender = (m.sender || m.from || "user").toLowerCase();
        const isBot = sender === "bot";
        const isAgent = sender === "agent";
        const isSystem = isBot || isAgent;

        return (
          <div 
            key={m.id || index}
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
                {renderMessageContent(m, isSystem)}
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