import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import ChatWindow from '../components/chat/ChatWindow';
import ConversationList from '../components/chat/ConversationList';
import DashboardLayout from '../components/layout/DashboardLayout';
import apiClient from '../services/apiClient';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  const activeConvoRef = useRef<any>(null);

  const fetchConversations = async () => {
    try {
      const res = await apiClient.get('/chat/conversations');
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setConversations([]);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await apiClient.get(`/chat/conversations/${conversationId}`);
      setMessages(Array.isArray(res.data?.messages) ? res.data.messages : []);
    } catch (err) {
      console.error('Chat history fetch failed:', err);
      setMessages([]);
    }
  };

  useEffect(() => {
    fetchConversations();

    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    );

    const handleRealtimeUpdate = async (msg: any) => {
      fetchConversations();

      const currentActive = activeConvoRef.current;
      if (currentActive && msg?.conversationId === currentActive.id) {
        await fetchMessages(currentActive.id);
      }
    };

    newSocket.on('dashboard_update', handleRealtimeUpdate);

    return () => {
      newSocket.off('dashboard_update', handleRealtimeUpdate);
      newSocket.disconnect();
    };
  }, []);

  const handleSelectConversation = async (convo: any) => {
    setActiveConversation(convo);
    activeConvoRef.current = convo;
    setMessages([]);
    await fetchMessages(convo.id);
  };

  const handleResumeBot = () => {
    fetchConversations();
    setActiveConversation((prev: any) => {
      const updated = prev ? { ...prev, agent_pending: false, status: 'active' } : prev;
      activeConvoRef.current = updated;
      return updated;
    });
  };

  const handleMessageSent = (msg: any) => {
    setMessages((prev) => [
      ...prev,
      {
        id: msg.id || Date.now(),
        sender: 'agent',
        content:
          msg.content || {
            type: 'text',
            text: msg.message || msg.text || '',
          },
        created_at: msg.timestamp || new Date().toISOString(),
      },
    ]);
  };

  return (
    <DashboardLayout title="Live Conversations">
      <div className="flex h-[calc(100vh-100px)] bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mx-6 mb-6">
        <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50">
          <div className="p-5 border-b border-slate-200 bg-white">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              Active Conversations
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              list={conversations}
              activeId={activeConversation?.id}
              onSelect={handleSelectConversation}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-slate-50/50 relative">
          <ChatWindow
            messages={messages}
            activeConversation={activeConversation}
            onResumeBot={handleResumeBot}
            onMessageSent={handleMessageSent}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
