import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import DashboardLayout from "../components/layout/DashboardLayout";
import BotCreationModal from "../components/forms/BotCreationModal";
import EditBotModal from "../components/forms/EditBotModal";
import TestMessageModal from "../components/forms/TestMessageModal";
import { botService } from "../services/botService";
import { useBotStore } from "../store/botStore";
import { 
  Rocket, Trash2, Edit3, ShieldCheck, Loader2, Send, Lock, 
  AlertCircle, Plus, Power, Activity 
} from "lucide-react";

export default function BotsPage() {
  const router = useRouter();
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<any>(null);
  const [testingBot, setTestingBot] = useState<any>(null);

  /** * ✅ NEW LOGIC: Use 'unlockedBotIds' array from store 
   * and specific lock/unlock/sync functions.
   */
  const { unlockedBotIds, setBotUnlock, setBotLock, syncUnlockedBots, checkLockStatus } = useBotStore();

  const load = async () => {
    setLoading(true);
    checkLockStatus(); 
    try {
      const data = await botService.getBots();
      setBots(data);
      // ✅ Instantly clean up any ghost IDs in local storage
      syncUnlockedBots(data.map((b: any) => String(b.id)));
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (botId: string, currentStatus: string) => {
    setIsToggling(botId);
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      // Sync with backend DB status column
      await botService.updateBot(botId, { status: newStatus });
      await load();
    } catch (err) {
      console.error("Status toggle failed", err);
    } finally {
      setIsToggling(null);
    }
  };

  const handleUnlockToggle = async (bot: any) => {
    const isCurrentlyUnlocked = unlockedBotIds.includes(bot.id);

    if (isCurrentlyUnlocked) {
      setBotLock(bot.id);
    } else {
      // The store function 'setBotUnlock' already handles the 5-slot limit
      setIsActivating(bot.id);
      try {
        await botService.activateBot(bot.id);
        setBotUnlock(bot.id);
      } catch (err) {
        console.error("Unlock failed", err);
      } finally {
        setIsActivating(null);
      }
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(checkLockStatus, 10000); 
    return () => clearInterval(interval);
  }, []);

  const activeBots = bots.filter(b => b.status === 'active');
  const inactiveBots = bots.filter(b => b.status !== 'active');

  const BotCard = ({ b }: { b: any }) => {
    const isUnlocked = unlockedBotIds.includes(b.id);
    const isLive = b.status === 'active';
    const activating = isActivating === b.id;
    const toggling = isToggling === b.id;

    return (
      <div className={`bg-white p-8 rounded-[2rem] border-2 transition-all duration-500 relative group ${
        isUnlocked ? "border-blue-500 shadow-2xl scale-[1.02]" : "border-slate-100 hover:border-slate-200"
      } ${!isLive ? "opacity-75 grayscale-[0.6]" : ""}`}>
        
        {/* SLOT STATUS BADGE */}
        <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm ${isUnlocked ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
           {isUnlocked ? <><ShieldCheck size={10}/> Builder Slot Active</> : <><Lock size={10}/> Slot Locked</>}
        </div>

        {/* ACTIONS & POWER TOGGLE */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-4 opacity-40 group-hover:opacity-100 transition-opacity">
            {/* ✅ UPDATED DELETE LOGIC: Release lock BEFORE deleting */}
            <button onClick={async () => { 
                if(confirm("Delete bot?")) {
                    setBotLock(b.id);
                    await botService.deleteBot(b.id);
                    load();
                }
            }} className="hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
            <button onClick={() => { setEditingBot(b); setIsEditModalOpen(true); }} className="hover:text-slate-900 transition-colors"><Edit3 size={16} /></button>
            <button onClick={() => { setTestingBot(b); setIsTestModalOpen(true); }} className="hover:text-blue-500 transition-colors"><Send size={16} /></button>
          </div>
          
          <button 
            onClick={() => handleToggleStatus(b.id, b.status)}
            disabled={toggling}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all active:scale-90 ${isLive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}
          >
            {toggling ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
            <span className="text-[9px] font-black uppercase tracking-widest">{isLive ? 'Live' : 'Off'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3 mb-2">
            <h3 className="font-black text-slate-900 text-xl truncate uppercase tracking-tight">{b.name}</h3>
            {isLive && <Activity size={16} className="text-emerald-500 animate-pulse" />}
        </div>
        <p className="text-[10px] text-slate-400 font-bold mb-6 uppercase tracking-widest truncate">Trigger: {b.trigger_keywords || "None"}</p>

        <div className="space-y-3">
          <button
            onClick={() => handleUnlockToggle(b)}
            disabled={activating}
            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
              isUnlocked ? "bg-red-50 text-red-500 border border-red-100 hover:bg-red-100" : "bg-slate-900 text-white hover:bg-black"
            }`}
          >
            {activating ? <Loader2 size={12} className="animate-spin" /> : isUnlocked ? "Release Builder Slot" : `Unlock Builder (${unlockedBotIds.length}/5)`}
          </button>

          {isUnlocked && (
            <button
              onClick={() => router.push(`/flows?botId=${b.id}`)}
              className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg animate-in fade-in duration-500"
            >
              <Rocket size={14} /> Open Flow Designer
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto pb-20 px-4">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-10 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Instance Manager</h1>
            <div className="flex gap-4 mt-2">
                <p className="text-[9px] bg-slate-100 px-2 py-0.5 rounded font-black text-slate-500 uppercase">{activeBots.length} ACTIVE BOTS</p>
                <p className="text-[9px] bg-blue-100 px-2 py-0.5 rounded font-black text-blue-600 uppercase">{unlockedBotIds.length}/5 SLOTS USED</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white text-[10px] px-6 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 flex items-center gap-2"
          >
            <Plus size={14} /> Provision Bot
          </button>
        </div>

        {/* LIVE SECTION */}
        <div className="mb-16">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                Live Network
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeBots.map(b => <BotCard key={b.id} b={b} />)}
                {activeBots.length === 0 && !loading && (
                    <div className="col-span-full border-2 border-dashed border-slate-100 rounded-[3rem] py-20 flex flex-col items-center justify-center text-slate-300">
                        <Activity size={48} className="mb-4 opacity-10" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">No WhatsApp Deployments</span>
                    </div>
                )}
            </div>
        </div>

        {/* INACTIVE SECTION */}
        {inactiveBots.length > 0 && (
            <div className="border-t border-slate-50 pt-12">
                <h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-8">Parked / Drafts</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {inactiveBots.map(b => <BotCard key={b.id} b={b} />)}
                </div>
            </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-50 flex flex-col items-center justify-center text-slate-900 gap-4">
            <Loader2 className="animate-spin" size={40} />
            <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Syncing Database...</span>
          </div>
        )}

        <BotCreationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={load} />
        <EditBotModal isOpen={isEditModalOpen} onClose={() => {setIsEditModalOpen(false); setEditingBot(null);}} bot={editingBot} onSuccess={load} />
        <TestMessageModal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} bot={testingBot} />
      </div>
    </DashboardLayout>
  );
}