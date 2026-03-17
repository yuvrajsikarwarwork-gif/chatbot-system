import DashboardLayout from "../components/layout/DashboardLayout";

export default function AgentsPage() {
  const agents = [
    { id: 1, name: "Yuvraj Sikarwar", role: "Admin", status: "online", email: "yuvraj@example.com" },
    { id: 2, name: "Support Lead", role: "Editor", status: "offline", email: "support@internal.com" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Access Management</h1>
            <p className="text-sm text-slate-500 mt-1">Configure workspace permissions and agent roles.</p>
          </div>
          <button className="bg-slate-900 text-white text-sm px-4 py-2 rounded font-semibold hover:bg-slate-800 transition-colors">
            Invite Agent
          </button>
        </div>

        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identity</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Privileges</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-slate-800 text-sm">{agent.name}</div>
                    <div className="text-xs text-slate-400">{agent.email}</div>
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] font-bold text-slate-500 border border-slate-200 px-2 py-0.5 rounded uppercase">
                      {agent.role}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="capitalize">{agent.status}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-slate-300 hover:text-slate-600">•••</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}