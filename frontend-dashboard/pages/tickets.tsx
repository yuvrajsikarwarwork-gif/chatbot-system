import { useEffect, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { agentService, Ticket } from "../services/agentService";
import { useBotStore } from "../store/botStore";

export default function TicketsPage() {
  const botId = useBotStore((s) => s.selectedBotId);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const loadTickets = async () => {
    if (!botId) return;
    try {
      const data = await agentService.getTickets(botId);
      setTickets(data);
    } catch (err) {
      console.error("Failed to load tickets", err);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [botId]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
          <div className="flex gap-2">
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
              {tickets.filter(t => t.status === 'open').length} Active
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ticket ID</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 text-sm">
                    No active handoff tickets for this bot.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/50">
                    <td className="p-4 text-xs font-mono text-slate-500">#{ticket.id.slice(0, 8)}</td>
                    <td className="p-4 text-sm font-medium text-slate-800">{ticket.subject}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        ticket.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${ticket.status === 'open' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-xs text-slate-600 capitalize">{ticket.status}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-blue-600 hover:underline text-sm font-medium">View Chat</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}