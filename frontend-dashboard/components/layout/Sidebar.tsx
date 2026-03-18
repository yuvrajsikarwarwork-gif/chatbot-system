import Link from "next/link";
import { useRouter } from "next/router";

// Standardized CSS-based icons
const Icons = {
  Dashboard: () => <div className="w-4 h-4 border-2 border-current rounded-sm" />,
  Bots: () => <div className="w-4 h-4 border-2 border-current rounded-full" />,
  Flow: () => <div className="w-4 h-4 flex gap-0.5"><div className="w-1 h-4 bg-current"/><div className="w-1 h-2 bg-current self-center"/><div className="w-1 h-4 bg-current"/></div>,
  Leads: () => <div className="w-4 h-4 border-2 border-current rounded-md flex items-center justify-center relative overflow-hidden"><div className="w-full h-[1px] bg-current absolute top-1/2 -translate-y-1/2" /><div className="h-full w-[1px] bg-current absolute left-1/2 -translate-x-1/2" /></div>,
  Templates: () => <div className="w-4 h-4 border-2 border-current rounded-sm flex flex-col gap-0.5 p-0.5"><div className="w-full h-[1px] bg-current"/><div className="w-full h-[1px] bg-current"/><div className="w-2 h-[1px] bg-current"/></div>,
  Campaigns: () => <div className="w-4 h-4 border-2 border-current rounded-full relative overflow-hidden"><div className="absolute inset-0 border-b-2 border-current -rotate-45 translate-y-[-1px]" /></div>,
  Chat: () => <div className="w-4 h-3 border-2 border-current rounded-sm relative after:content-[''] after:absolute after:top-full after:left-1 after:border-4 after:border-transparent after:border-t-current" />,
  Integrations: () => <div className="w-4 h-4 border-2 border-current rounded-full flex items-center justify-center"><div className="w-1 h-1 bg-current" /></div>,
  Analytics: () => <div className="w-4 h-4 flex items-end gap-0.5"><div className="w-1 h-2 bg-current"/><div className="w-1 h-4 bg-current"/><div className="w-1 h-3 bg-current"/></div>,
  Agents: () => <div className="w-4 h-4 border-2 border-current rounded-t-lg" />,
  // --- NEW SETTINGS & TEAM ICONS ---
  Settings: () => <div className="w-4 h-4 border-2 border-dashed border-current rounded-full animate-[spin_8s_linear_infinite]" />,
  Team: () => <div className="w-4 h-4 flex items-center justify-center gap-0.5"><div className="w-1.5 h-3 border-2 border-current rounded-t-md" /><div className="w-1.5 h-3 border-2 border-current rounded-t-md" /></div>
};

export default function Sidebar() {
  const router = useRouter();
  
  const menu = [
    { label: "Dashboard", path: "/", Icon: Icons.Dashboard },
    { label: "Bots", path: "/bots", Icon: Icons.Bots },
    { label: "Flow Builder", path: "/flows", Icon: Icons.Flow },
    { label: "Leads", path: "/leads", Icon: Icons.Leads },
    { label: "Templates", path: "/templates", Icon: Icons.Templates },
    { label: "Campaigns", path: "/campaigns", Icon: Icons.Campaigns },
    { label: "Conversations", path: "/conversations", Icon: Icons.Chat },
    { label: "Integrations", path: "/integrations", Icon: Icons.Integrations },
    { label: "Analytics", path: "/analytics", Icon: Icons.Analytics },
    { label: "Agents", path: "/agents", Icon: Icons.Agents },
    // ✅ Added Settings & Team
    { label: "Team", path: "/settings?tab=team", Icon: Icons.Team }, 
    { label: "Settings", path: "/settings", Icon: Icons.Settings },
  ];

  return (
    <div className="w-64 bg-[#0f172a] h-screen text-slate-400 flex flex-col border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">B</div>
          <span className="text-white font-bold text-lg tracking-tight">BOT.OS</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menu.map(({ label, path, Icon }) => {
          // Check if path matches exactly or if it's a sub-tab of settings
          const isActive = router.pathname === path || (path.startsWith('/settings') && router.pathname === '/settings');
          return (
            <Link 
              key={path} 
              href={path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all group ${
                isActive 
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" 
                : "hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <span className={`${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`}>
                <Icon />
              </span>
              <span className="text-sm font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-2 text-xs text-slate-500 font-semibold uppercase tracking-widest">
          v1.1.0-omni
        </div>
      </div>
    </div>
  );
}