import React, { useState } from "react";
import { Bot, CheckCircle2, FolderOpen, ImagePlus, Loader2, Paperclip, Send, User } from "lucide-react";
import type { ChangeEvent } from "react";
import { useRef } from "react";

import apiClient from "../../services/apiClient";
import MessageList from "./MessageList";
import TemplateSelectModal from "./TemplateSelectModal";

interface ChatWindowProps {
  messages: any[];
  activeConversation: any;
  onResumeBot: () => void;
  onMessageSent: (msg: any) => Promise<void>;
  canResumeBot?: boolean;
  canManualReply?: boolean;
  showCampaign?: boolean;
  showFlow?: boolean;
  showList?: boolean;
}

const platformThemes: Record<string, any> = {
  whatsapp: {
    containerBg: "bg-card",
    pattern: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
    headerBg: "bg-background border-b border-border",
    headerText: "text-foreground",
    headerSubText: "text-muted",
    inputBg: "bg-background border-t border-border",
    buttonColor: "bg-primary hover:opacity-95 text-white",
    botNoticeBg: "bg-primary-fade border border-primary/20 text-primary",
    has24HourRule: true,
  },
  instagram: {
    containerBg: "bg-card",
    pattern: "none",
    headerBg: "bg-background border-b border-border",
    headerText: "text-foreground",
    headerSubText: "text-muted",
    inputBg: "bg-background border-t border-border",
    buttonColor: "bg-primary hover:opacity-95 text-white",
    botNoticeBg: "bg-primary-fade border border-primary/20 text-primary",
    has24HourRule: true,
  },
  facebook: {
    containerBg: "bg-card",
    pattern: "none",
    headerBg: "bg-background border-b border-border",
    headerText: "text-foreground",
    headerSubText: "text-muted",
    inputBg: "bg-background border-t border-border",
    buttonColor: "bg-primary hover:opacity-95 text-white",
    botNoticeBg: "bg-primary-fade border border-primary/20 text-primary",
    has24HourRule: true,
  },
  web: {
    containerBg: "bg-card",
    pattern: "none",
    headerBg: "bg-background border-b border-border",
    headerText: "text-foreground",
    headerSubText: "text-muted",
    inputBg: "bg-background border-t border-border",
    buttonColor: "bg-primary hover:opacity-95 text-white",
    botNoticeBg: "bg-primary-fade border border-primary/20 text-primary",
    has24HourRule: false,
  },
  website: {
    containerBg: "bg-card",
    pattern: "none",
    headerBg: "bg-background border-b border-border",
    headerText: "text-foreground",
    headerSubText: "text-muted",
    inputBg: "bg-background border-t border-border",
    buttonColor: "bg-primary hover:opacity-95 text-white",
    botNoticeBg: "bg-primary-fade border border-primary/20 text-primary",
    has24HourRule: false,
  },
};

const QUICK_REPLIES = [
  "On it",
  "Thanks for the update",
  "Please share more details",
  "We will get back to you shortly",
];

export default function ChatWindow({
  messages,
  activeConversation,
  onResumeBot,
  onMessageSent,
  canResumeBot = true,
  canManualReply = true,
  showCampaign = true,
  showFlow = true,
  showList = true,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const platform =
    (activeConversation?.channel || activeConversation?.platform || "whatsapp") === "web"
      ? "website"
      : activeConversation?.channel || activeConversation?.platform || "whatsapp";
  const theme = platformThemes[platform] || platformThemes.whatsapp;
  const userId = activeConversation?.external_id || activeConversation?.platform_user_id;

  const is24HourWindowOpen = () => {
    if (!theme.has24HourRule) return true;
    if (!activeConversation?.last_inbound_at) return false;

    const lastMsgTime = new Date(activeConversation.last_inbound_at).getTime();
    const now = Date.now();
    const hoursDifference = (now - lastMsgTime) / (1000 * 60 * 60);
    return hoursDifference < 24;
  };

  const windowOpen = is24HourWindowOpen();

  const handleResume = async () => {
    if (!activeConversation) return;

    try {
      const res = await apiClient.post(`/chat/conversations/${activeConversation.id}/resume`);
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
      await onMessageSent({
        text: inputValue,
        type: "text",
      });
      setInputValue("");
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReply = async (value: string) => {
    if (isSending) {
      return;
    }

    setIsSending(true);
    try {
      await onMessageSent({
        text: value,
        type: "text",
      });
    } catch (error) {
      console.error("Failed to send quick reply", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleUploadSend = async (event: ChangeEvent<HTMLInputElement>, mode: "image" | "document") => {
    const file = event.target.files?.[0];
    if (!file || isSending) {
      event.target.value = "";
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const mediaUrl = response.data?.url;
      if (!mediaUrl) {
        throw new Error("Upload response did not include a URL");
      }

      await onMessageSent({
        text: inputValue.trim() || undefined,
        type: mode,
        mediaUrl,
      });
      setInputValue("");
    } catch (error) {
      console.error("Failed to upload and send media", error);
    } finally {
      setIsSending(false);
      event.target.value = "";
    }
  };

  if (!activeConversation) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center rounded-[28px] bg-[rgba(255,255,255,0.72)] text-slate-400">
        <Bot size={64} className="mb-4 opacity-20" />
        <h2 className="text-xl font-black uppercase tracking-[0.22em] text-slate-300">
          No Conversation Selected
        </h2>
        <p className="mt-2 text-sm">Select a conversation from any platform to begin.</p>
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-full flex-1 flex-col overflow-hidden rounded-[28px] ${theme.containerBg} transition-colors duration-300`}
    >
      <div
        className={`${theme.headerBg} z-20 flex shrink-0 items-center justify-between px-5 py-4 transition-colors duration-300`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-fade text-current">
            <User size={24} className={`mt-2 ${theme.headerText}`} />
          </div>
          <div className="min-w-0">
            <h3 className={`truncate font-semibold leading-tight ${theme.headerText}`}>
              {activeConversation.display_name ||
                activeConversation.user_name ||
                activeConversation.name ||
                "User"}
              <span className="ml-2 inline-flex max-w-[120px] truncate rounded-full bg-primary-fade px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                {platform}
              </span>
            </h3>
            <p className={`truncate text-xs font-mono ${theme.headerSubText}`}>
              {activeConversation.contact_phone_resolved || userId}
            </p>
            <div className={`mt-1 flex flex-wrap gap-2 text-[10px] font-medium ${theme.headerSubText}`}>
              {showCampaign && activeConversation.campaign_name ? (
                <span className="rounded-full bg-primary-fade px-2 py-0.5 text-primary">
                  {activeConversation.campaign_name}
                </span>
              ) : null}
              {showFlow && activeConversation.flow_name ? (
                <span className="rounded-full bg-primary-fade px-2 py-0.5 text-primary">
                  {activeConversation.flow_name}
                </span>
              ) : null}
              {showList && activeConversation.list_name ? (
                <span className="rounded-full bg-primary-fade px-2 py-0.5 text-primary">
                  {activeConversation.list_name}
                </span>
              ) : null}
              {activeConversation.platform_account_name ? (
                <span className="rounded-full bg-primary-fade px-2 py-0.5 text-primary">
                  {activeConversation.platform_account_name}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {activeConversation.status === "agent_pending" && canResumeBot ? (
          <button
            onClick={handleResume}
            className="ml-3 flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:opacity-95 active:scale-95"
          >
            <CheckCircle2 size={16} /> Resolve Issue
          </button>
        ) : null}
      </div>

      <div
        className="relative flex-1 overflow-hidden transition-all duration-300 bg-card"
        style={{
          backgroundImage: theme.pattern,
          backgroundRepeat: "repeat",
          backgroundSize: "initial",
          opacity: platform === "whatsapp" ? 0.85 : 1,
        }}
      >
        <div className="relative z-10 h-full pb-4">
          <MessageList messages={messages} />
        </div>
      </div>

      <div className={`${theme.inputBg} z-20 shrink-0 px-4 pb-4 pt-3 transition-colors duration-300`}>
        {activeConversation.status === "agent_pending" ? (
          !canManualReply ? (
            <div className={`${theme.botNoticeBg} mx-2 rounded-2xl p-3 text-center shadow-sm`}>
              <p className="text-xs font-medium">
                Manual reply is disabled for this workspace.
              </p>
            </div>
          ) :
          windowOpen ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    disabled={isSending}
                    onClick={() => handleQuickReply(reply)}
                    className="rounded-full border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-primary-fade hover:text-primary hover:border-primary/30 disabled:opacity-50"
                  >
                    {reply}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
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
                  className="min-h-[48px] max-h-[120px] flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm transition-all placeholder:text-muted focus:border-primary focus:outline-none"
                  rows={1}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => handleUploadSend(event, "image")}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => handleUploadSend(event, "document")}
                />
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => imageInputRef.current?.click()}
                  className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-2xl border border-border bg-transparent p-3 text-foreground shadow-sm transition-all hover:bg-primary-fade hover:text-primary hover:border-primary/30 disabled:opacity-50"
                  title="Upload image"
                >
                  <ImagePlus size={18} />
                </button>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-2xl border border-border bg-transparent p-3 text-foreground shadow-sm transition-all hover:bg-primary-fade hover:text-primary hover:border-primary/30 disabled:opacity-50"
                  title="Upload file"
                >
                  <Paperclip size={18} />
                </button>
                {theme.has24HourRule ? (
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-2xl border border-border bg-transparent p-3 text-foreground shadow-sm transition-all hover:bg-primary-fade hover:text-primary hover:border-primary/30"
                    title="Send approved template"
                  >
                    <FolderOpen size={18} />
                  </button>
                ) : null}
                <button
                  disabled={isSending || !inputValue.trim()}
                  onClick={handleSend}
                  className={`${theme.buttonColor} flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-2xl p-3 shadow-sm transition-all disabled:bg-muted disabled:opacity-50`}
                >
                  {isSending ? (
                    <Loader2 size={18} className="animate-spin text-white" />
                  ) : (
                    <Send size={18} className="ml-1 text-white" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="min-w-0 pr-3">
                <p className="text-sm font-bold text-foreground">24-Hour Window Closed</p>
                <p className="mt-0.5 text-xs text-muted">
                  Meta requires a pre-approved template to resume contact.
                </p>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(true)}
                className="flex shrink-0 items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95"
              >
                <FolderOpen size={16} /> Send Template
              </button>
            </div>
          )
        ) : (
          <div className={`${theme.botNoticeBg} mx-2 rounded-2xl p-3 text-center shadow-sm`}>
            <p className="text-xs font-medium">
              The automation engine is currently handling this conversation.
            </p>
          </div>
        )}
      </div>

      <TemplateSelectModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        conversationId={activeConversation.id}
        activeConversation={activeConversation}
        onSend={onMessageSent}
        onSent={() => setIsTemplateModalOpen(false)}
      />
    </div>
  );
}
