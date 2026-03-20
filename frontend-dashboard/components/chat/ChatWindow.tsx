import React, { useState } from "react";
import MessageList from "./MessageList";
import { CheckCircle2, Send, User, Bot, Loader2, FolderOpen } from "lucide-react";
import apiClient from "../../services/apiClient"; 
import TemplateSelectModal from "./TemplateSelectModal";

interface ChatWindowProps {
  messages: any[];
  activeConversation: any;
  onResumeBot: () => void;
  onMessageSent: (msg: any) => void;
}

// 🎨 Omni-Channel Theme Configuration
const platformThemes: Record<string, any> = {
  whatsapp: {
    containerBg: "bg-[#efeae2]",
    pattern: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
    headerBg: "bg-[#f0f2f5]",
    headerText: "text-slate-800",
    headerSubText: "text-slate-500",
    inputBg: "bg-[#f0f2f5]",
    buttonColor: "bg-emerald-500 hover:bg-emerald-600 text-white",
    botNoticeBg: "bg-[#e1f5fe] border-blue-100 text-blue-800",
    has24HourRule: true
  },
  instagram: {
    containerBg: "bg-slate-50",
    pattern: "none",
    headerBg: "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400",
    headerText: "text-white",
    headerSubText: "text-white/80",
    inputBg: "bg-white border-t border-slate-200",
    buttonColor: "bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white",
    botNoticeBg: "bg-purple-50 border-purple-100 text-purple-800",
    has24HourRule: true
  },
  facebook: {
    containerBg: "bg-white",
    pattern: "none",
    headerBg: "bg-white border-b border-gray-200",
    headerText: "text-slate-800",
    headerSubText: "text-slate-500",
    inputBg: "bg-gray-50 border-t border-gray-200",
    buttonColor: "bg-[#0084ff] hover:bg-[#0073e6] text-white",
    botNoticeBg: "bg-blue-50 border-blue-100 text-blue-800",
    has24HourRule: true
  },
  website: {
    containerBg: "bg-slate-50",
    pattern: "none",
    headerBg: "bg-slate-900",
    headerText: "text-white",
    headerSubText: "text-gray-300",
    inputBg: "bg-white border-t border-slate-200",
    buttonColor: "bg-slate-800 hover:bg-slate-900 text-white",
    botNoticeBg: "bg-slate-200 border-slate-300 text-slate-800",
    has24HourRule: false 
  }
};

export default function ChatWindow({ messages, activeConversation, onResumeBot, onMessageSent }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const platform = activeConversation?.channel || activeConversation?.platform || 'whatsapp';
  const theme = platformThemes[platform] || platformThemes['whatsapp'];
  
  const userId = activeConversation?.platform_user_id || activeConversation?.wa_number;

  const is24HourWindowOpen = () => {
    if (!theme.has24HourRule) return true; 
    if (!activeConversation?.last_user_msg_at) return false;
    const lastMsgTime = new Date(activeConversation.last_user_msg_at).getTime();
    const now = new Date().getTime();
    const hoursDifference = (now - lastMsgTime) / (1000 * 60 * 60);
    return hoursDifference < 24;
  };

  const windowOpen = is24HourWindowOpen();

  const handleResume = async () => {
    if (!activeConversation) return;
    try {
      const res = await apiClient.post("/chat/resume", { wa_number: userId, platform });
      if (res.data.success) {
        onResumeBot(); 
      }
    } catch (err) {
      console.error("Failed to resume bot", err);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;
    setIsSending(true);

    try {
      // ✅ Updated to use the unified Conversation-First router
      // Note: Adjust the prefix (/agent/ or /api/) if your Axios instance doesn't append it automatically.
      await apiClient.post(`/conversations/${activeConversation.id}/reply`, { text: inputValue });
      
      // Manually add the generic payload structure to state for immediate rendering
      onMessageSent({ 
        id: Date.now(), 
        content: { type: "text", text: inputValue }, 
        sender: "agent", 
        created_at: new Date().toISOString() 
      });
      setInputValue(""); 
    } catch (error) {
      console.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400 border-l border-slate-200">
        <Bot size={64} className="mb-4 opacity-20" />
        <h2 className="text-xl font-black text-slate-300 uppercase tracking-widest">No Conversation Selected</h2>
        <p className="text-sm mt-2">Select a lead from any platform to begin.</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col ${theme.containerBg} relative h-full border-l border-slate-200 transition-colors duration-300`}>
      
      <div className={`${theme.headerBg} p-3 flex justify-between items-center z-20 shrink-0 transition-colors duration-300 shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center text-current overflow-hidden backdrop-blur-sm">
            <User size={24} className={`mt-2 ${theme.headerText}`} />
          </div>
          <div>
            <h3 className={`font-semibold leading-tight ${theme.headerText}`}>
              {activeConversation.user_name || activeConversation.wa_name || activeConversation.name || "User"}
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-black/10 uppercase tracking-wider">
                {platform}
              </span>
            </h3>
            <p className={`text-xs font-mono ${theme.headerSubText}`}>{userId}</p>
          </div>
        </div>

        {activeConversation.status === 'agent_pending' && (
          <button onClick={handleResume} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95">
            <CheckCircle2 size={16} /> Resolve Issue
          </button>
        )}
      </div>

      <div 
        className="flex-1 overflow-hidden relative transition-all duration-300"
        style={{ 
          backgroundImage: theme.pattern,
          backgroundRepeat: "repeat",
          backgroundSize: "initial",
          opacity: platform === 'whatsapp' ? 0.85 : 1
        }}
      >
        <div className="relative h-full z-10 pb-4">
          <MessageList messages={messages} />
        </div>
      </div>

      <div className={`${theme.inputBg} p-3 shrink-0 z-20 transition-colors duration-300`}>
        {activeConversation.status === 'agent_pending' ? (
          windowOpen ? (
            <div className="flex gap-2 items-end">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Reply to ${platform} message...`}
                className="flex-1 bg-white border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-400 resize-none shadow-sm min-h-[44px] max-h-[120px] transition-all"
                rows={1}
              />
              <button disabled={isSending || !inputValue.trim()} onClick={handleSend} className={`${theme.buttonColor} p-3 rounded-full flex items-center justify-center transition-all shadow-sm disabled:opacity-50 disabled:bg-slate-400 h-[44px] w-[44px] shrink-0`}>
                {isSending ? <Loader2 size={18} className="animate-spin text-white" /> : <Send size={18} className="ml-1 text-white" />}
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-sm font-bold text-slate-800">24-Hour Window Closed</p>
                <p className="text-xs text-slate-500 mt-0.5">Meta requires a pre-approved template to resume contact.</p>
              </div>
              <button 
                onClick={() => setIsTemplateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
              >
                <FolderOpen size={16} /> Send Template
              </button>
            </div>
          )
        ) : (
          <div className={`${theme.botNoticeBg} rounded-lg p-3 text-center mx-4 mb-2 shadow-sm`}>
            <p className="text-xs font-medium">The automation engine is currently handling this conversation.</p>
          </div>
        )}
      </div>

      <TemplateSelectModal 
        isOpen={isTemplateModalOpen} 
        onClose={() => setIsTemplateModalOpen(false)} 
        waNumber={userId} 
        onSent={() => setIsTemplateModalOpen(false)} 
      />
    </div>
  );
}