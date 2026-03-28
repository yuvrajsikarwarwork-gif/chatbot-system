import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { ReactNode } from "react";
import GlobalBackStrip from "../navigation/GlobalBackStrip";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_8%,var(--primary-fade),transparent_18%),radial-gradient(circle_at_16%_14%,var(--primary-fade),transparent_24%)]" />
      <Sidebar />
      <div className="relative flex flex-1 flex-col overflow-hidden px-3 py-3 md:px-4 md:py-4">
        <Navbar />
        <GlobalBackStrip className="mb-2 mt-2" />
        <main className="platform-surface relative flex-1 overflow-auto rounded-[2rem] border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-colors duration-300 md:p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
