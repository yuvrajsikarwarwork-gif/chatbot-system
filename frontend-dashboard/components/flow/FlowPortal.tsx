import { useRouter } from "next/router";
import { BrainCircuit, ChevronRight, Plus } from "lucide-react";

interface FlowPortalProps {
  availableBots: any[];
  embedded?: boolean;
}

export default function FlowPortal({ availableBots, embedded = false }: FlowPortalProps) {
  const router = useRouter();

  return (
    <div
      className={`flex flex-col items-center overflow-y-auto px-4 py-2 md:px-6 md:py-3 ${
        embedded
          ? "min-h-full bg-transparent"
          : "h-screen w-screen bg-background text-foreground"
      }`}
    >
      <div className="max-w-6xl w-full flex flex-col items-center">
        <div className="mb-5 flex flex-col items-center text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 border ${
              embedded
                ? "bg-primary-fade text-primary border-primary/20"
                : "bg-primary-fade text-primary border-primary/20"
            }`}>
                <BrainCircuit size={28} />
            </div>
            <p className={`${embedded ? "text-foreground" : "text-muted"} text-sm font-semibold tracking-wide`}>
              Choose a bot slot to open the workflow builder.
            </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
            {availableBots.map((b) => (
                <button 
                    key={b.id} 
                    onClick={() => router.push(`/flows?botId=${b.id}`)}
                    className={`group p-8 rounded-[2.5rem] flex items-center justify-between transition-all duration-500 text-left relative overflow-hidden active:scale-[0.98] ${
                      embedded
                        ? "bg-card border border-border hover:bg-background hover:border-primary/30 shadow-sm"
                        : "bg-card border border-border hover:bg-primary-fade hover:border-primary/30"
                    }`}
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Active Slot</span>
                        </div>
                        <h3 className={`${embedded ? "text-foreground" : "text-foreground"} text-xl font-black uppercase tracking-tight mb-1 group-hover:text-primary transition-colors`}>{b.name}</h3>
                        <p className="text-muted text-[10px] font-mono tracking-tighter uppercase">ID: {b.id.slice(0, 18)}...</p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-12 transition-all duration-500 ${
                      embedded ? "bg-background text-foreground border border-border" : "bg-background text-foreground border border-border"
                    }`}>
                        <ChevronRight size={24} />
                    </div>
                    <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl transition-all ${
                      embedded ? "bg-primary-fade group-hover:bg-primary-fade" : "bg-primary-fade group-hover:bg-primary-fade"
                    }`} />
                </button>
            ))}
            
            <button 
                onClick={() => router.push('/bots')}
                className={`group border-2 border-dashed p-8 rounded-[2.5rem] flex flex-col items-center justify-center transition-all text-center gap-3 ${
                  embedded
                    ? "border-border hover:border-primary/30 bg-card"
                    : "border-border hover:border-primary/30 bg-card"
                } ${availableBots.length === 0 ? 'md:col-span-2 mx-auto w-full md:w-1/2' : ''}`}
            >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-muted transition-all ${
                  embedded ? "bg-background border border-border group-hover:text-primary group-hover:bg-primary-fade" : "bg-background border border-border group-hover:text-primary group-hover:bg-primary-fade"
                }`}>
                    <Plus size={20} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  embedded ? "text-muted group-hover:text-primary" : "text-muted group-hover:text-primary"
                }`}>Open Bot Slots</span>
            </button>
        </div>

        {availableBots.length === 0 && (
            <div className={`mt-12 p-6 border rounded-2xl text-center max-w-md ${
              embedded ? "bg-primary-fade border-primary/20" : "bg-primary-fade border-primary/20"
            }`}>
                 <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                   No Bot Slots Available. <br/>
                   <span className="opacity-60 font-medium">Open one from Bot Manager to continue.</span>
                  </p>
            </div>
        )}
      </div>
    </div>
  );
}
