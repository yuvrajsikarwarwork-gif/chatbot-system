import { useEffect, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useBotStore } from "../store/botStore";

// Analytics metrics interface
interface DashboardStats {
  total_conversations: number;
  messages_today: number;
  active_users: number;
  handoff_rate: string;
}

export default function DashboardPage() {
  const selectedBotId = useBotStore((s) => s.selectedBotId);
  const [stats, setStats] = useState<DashboardStats>({
    total_conversations: 0,
    messages_today: 0,
    active_users: 0,
    handoff_rate: "0%"
  });

  // In a real scenario, this would fetch from GET /analytics/bot/:botId
  useEffect(() => {
    if (selectedBotId) {
      // Mocking the API response for frontend-only focus
      setStats({
        total_conversations: 1284,
        messages_today: 432,
        active_users: 89,
        handoff_rate: "4.2%"
      });
    }
  }, [selectedBotId]);

  const metrics = [
    { label: "Total Conversations", value: stats.total_conversations, color: "border-blue-500" },
    { label: "Messages (24h)", value: stats.messages_today, color: "border-emerald-500" },
    { label: "Active Users", value: stats.active_users, color: "border-indigo-500" },
    { label: "Handoff Rate", value: stats.handoff_rate, color: "border-orange-500" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Performance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitoring active context: <span className="font-mono text-blue-600">{selectedBotId || "GLOBAL_ROOT"}</span>
          </p>
        </header>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {metrics.map((m) => (
            <div key={m.label} className={`bg-white border border-slate-200 border-l-4 ${m.color} p-5 rounded shadow-sm`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
              <p className="text-2xl font-bold text-slate-900">{m.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Activity Log */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Recent System Events</h2>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
              <div className="divide-y divide-slate-100">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-[10px] font-bold text-slate-400">
                        EVT
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Worker Execution Success</p>
                        <p className="text-[10px] text-slate-400 font-mono">JOB_ID: 88291-AZ</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">2m ago</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* System Health Sidebar */}
          <div className="space-y-6">
            <div className="bg-[#0f172a] p-6 rounded border border-slate-800 shadow-xl">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Environment Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-300">Bot Engine</span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Stable</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-300">Redis Queue</span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Online</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-300">Connectors</span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">4 Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}