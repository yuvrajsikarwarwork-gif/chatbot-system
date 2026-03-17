import DashboardLayout from "../components/layout/DashboardLayout";

export default function AnalyticsPage() {
  const stats = [
    { label: "Total Conversations", value: "1,284", change: "+12%" },
    { label: "Avg. Response Time", value: "1.2s", change: "-5%" },
    { label: "Completion Rate", value: "88%", change: "+2%" },
    { label: "Active Users", value: "432", change: "+18%" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Analytics Overview</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 font-medium">{s.label}</p>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-2xl font-bold text-gray-900">{s.value}</span>
                <span className={`text-xs font-bold mb-1 ${s.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {s.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Chart Placeholder */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-80 flex flex-col items-center justify-center">
          <div className="text-gray-400 mb-2">Weekly Activity Chart</div>
          <div className="w-full h-full bg-gray-50 rounded border-dashed border-2 border-gray-200 flex items-center justify-center text-gray-300">
             [ Chart Visualization Coming Soon ]
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}