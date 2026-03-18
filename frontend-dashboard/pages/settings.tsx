import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import apiClient from '../services/apiClient';
import { useAuthStore } from '../store/authStore';
import { useBotStore } from '../store/botStore';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { activeBotId } = useBotStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'bot'>('profile');

  // Form States
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/users/invite', { 
        botId: activeBotId, 
        email: inviteEmail, 
        role: inviteRole 
      });
      alert("Teammate invited successfully!");
      setInviteEmail('');
    } catch (err: any) {
      alert(err.response?.data?.error || "Invitation failed");
    }
  };

  return (
    <DashboardLayout title="System Settings">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex space-x-4 mb-8 border-b border-slate-200">
          <button onClick={() => setActiveTab('profile')} className={`pb-2 px-4 ${activeTab === 'profile' ? 'border-b-2 border-blue-600 font-bold' : ''}`}>Profile</button>
          <button onClick={() => setActiveTab('team')} className={`pb-2 px-4 ${activeTab === 'team' ? 'border-b-2 border-blue-600 font-bold' : ''}`}>Team Management</button>
          <button onClick={() => setActiveTab('bot')} className={`pb-2 px-4 ${activeTab === 'bot' ? 'border-b-2 border-blue-600 font-bold' : ''}`}>Bot Config</button>
        </div>

        {activeTab === 'profile' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-4">Your Profile</h3>
            <p className="text-slate-600 mb-4">Email: {user?.email}</p>
            <p className="text-slate-600 mb-4">Global Role: <span className="capitalize px-2 py-1 bg-slate-100 rounded text-xs">{user?.role}</span></p>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-4">Invite Teammate</h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <input 
                type="email" 
                placeholder="Teammate Email" 
                className="w-full p-2 border rounded"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <select 
                className="w-full p-2 border rounded"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="agent">Agent (Chat Only)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">Send Invitation</button>
            </form>
          </div>
        )}

        {activeTab === 'bot' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-4">Bot Settings</h3>
            <p className="text-sm text-slate-500 italic">Configuration for Bot ID: {activeBotId}</p>
            {/* Future: Add AI Threshold sliders and Auto-timeout toggles here */}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}