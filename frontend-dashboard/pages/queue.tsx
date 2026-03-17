import { useEffect, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { queueService, QueueJob } from "../services/queueService";

export default function QueuePage() {
  const [jobs, setJobs] = useState<QueueJob[]>([]);

  const loadJobs = async () => {
    try {
      const data = await queueService.getJobs();
      setJobs(data);
    } catch (err) {
      console.error("Failed to load queue data");
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Queue</h1>
            <p className="text-sm text-slate-500 mt-1">Monitor worker execution and background job status.</p>
          </div>
          <button 
            onClick={loadJobs}
            className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition-colors"
          >
            REFRESH LOGS
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 p-4 rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Processing</p>
            <p className="text-2xl font-bold text-slate-900">
              {jobs.filter(j => j.status === 'processing').length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-lg border-l-4 border-l-red-500">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Failed Tasks</p>
            <p className="text-2xl font-bold text-red-600">
              {jobs.filter(j => j.status === 'failed').length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Success Rate</p>
            <p className="text-2xl font-bold text-slate-900">99.8%</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job ID</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attempts</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id} className="text-sm">
                  <td className="p-4 font-mono text-xs text-slate-500">#{job.id.slice(0, 8)}</td>
                  <td className="p-4 font-semibold text-slate-700">{job.type}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      job.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">{job.attempts}/3</td>
                  <td className="p-4 text-right">
                    {job.status === 'failed' && (
                      <button 
                        className="text-blue-600 font-bold text-xs hover:underline"
                        onClick={() => queueService.retryJob(job.id)}
                      >
                        RETRY
                      </button>
                    )}
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