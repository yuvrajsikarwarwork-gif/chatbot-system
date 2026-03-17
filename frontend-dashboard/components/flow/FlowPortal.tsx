import { useRouter } from "next/router";
import { BrainCircuit, ChevronRight, Plus } from "lucide-react";

interface FlowPortalProps {
  availableBots: any[];
}

export default function FlowPortal({ availableBots }: FlowPortalProps) {
  const router = useRouter();

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 px-6 overflow-y-auto py-20">
      <div className="max-w-4xl w-full flex flex-col items-center">
        <div className="flex flex-col items-center mb-16 text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <BrainCircuit size={32} />
            </div>
            <h2 className="text-white text-4xl font-black uppercase tracking-tighter mb-3">Flow Portal</h2>
            <p className="text-slate-400 text-sm font-medium tracking-wide">Select an unlocked bot instance to enter the workspace.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full justify-center">
            {availableBots.map((b) => (
                <button 
                    key={b.id} 
                    onClick={() => router.push(`/flows?botId=${b.id}`)}
                    className="group bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex items-center justify-between hover:bg-white/10 hover:border-blue-500/50 transition-all duration-500 text-left relative overflow-hidden active:scale-[0.98]"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Active Slot</span>
                        </div>
                        <h3 className="text-white text-xl font-black uppercase tracking-tight mb-1 group-hover:text-blue-400 transition-colors">{b.name}</h3>
                        <p className="text-slate-500 text-[10px] font-mono tracking-tighter uppercase">ID: {b.id.slice(0, 18)}...</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white group-hover:bg-blue-600 group-hover:rotate-12 transition-all duration-500">
                        <ChevronRight size={24} />
                    </div>
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all" />
                </button>
            ))}
            
            <button 
                onClick={() => router.push('/bots')}
                className={`group border-2 border-dashed border-white/10 p-8 rounded-[2.5rem] flex flex-col items-center justify-center hover:border-white/30 transition-all text-center gap-3 ${availableBots.length === 0 ? 'md:col-span-2 mx-auto w-full md:w-1/2' : ''}`}
            >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-white group-hover:bg-white/10 transition-all">
                    <Plus size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">Provision New Slot</span>
            </button>
        </div>

        {availableBots.length === 0 && (
            <div className="mt-12 p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-center max-w-md">
                 <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em]">
                   No Unlocked Slots Found. <br/>
                   <span className="opacity-60 font-medium">Please unlock a bot in Instance Manager.</span>
                 </p>
            </div>
        )}
      </div>
    </div>
  );
}