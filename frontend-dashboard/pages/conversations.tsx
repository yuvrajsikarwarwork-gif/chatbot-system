import { useEffect, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";
import { messageService, Conversation, Message } from "../services/messageService";
import { useBotStore } from "../store/botStore";

export default function ConversationsPage() {
  const botId = useBotStore((s) => s.selectedBotId);

  const [list, setList] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);

  const load = async () => {
    if (!botId) return;

    try {
      const data = await messageService.getConversations(botId);
      setList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const open = async (c: Conversation) => {
    setActive(c);

    try {
      const msgs = await messageService.getMessages(c.id);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, [botId]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Conversations
        </h1>

        <div className="flex flex-1 min-h-[600px] bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <ConversationList 
            list={list} 
            onSelect={open} 
          />

          <ChatWindow 
            messages={messages} 
            activeConversation={active}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}