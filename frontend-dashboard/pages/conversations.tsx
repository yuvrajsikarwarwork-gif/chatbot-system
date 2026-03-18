import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import apiClient from '../services/apiClient';
import { io, Socket } from 'socket.io-client';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]); 
  const [socket, setSocket] = useState<Socket | null>(null);

  const fetchConversations = async () => {
    try {
      const res = await apiClient.get('/leads'); 
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setConversations([]);
    }
  };

  useEffect(() => {
    fetchConversations();

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('whatsapp_message', (msg: any) => {
      console.log("Real-time message received:", msg);
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleSelectConversation = (convo: any) => {
    setActiveConversation(convo);
    setMessages([]); 
  };

  const handleResumeBot = () => {
    fetchConversations(); 
    setActiveConversation((prev: any) => ({ ...prev, human_active: false }));
  };

  const handleMessageSent = (msg: any) => {
    setMessages(prev => [...prev, msg]);
  };

  return (
    <DashboardLayout title="Live Chat Inbox">
      <div className="flex h-[calc(100vh-100px)] bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mx-6 mb-6">
        
        <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50">
          <div className="p-5 border-b border-slate-200 bg-white">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Active Chats</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Manage bot handoffs and human support</p>
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