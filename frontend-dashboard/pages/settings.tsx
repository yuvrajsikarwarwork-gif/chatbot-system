import { useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useBotStore } from "../store/botStore";

export default function SettingsPage() {
  const botId = useBotStore((s) => s.selectedBotId);
  const [config, setConfig] = useState({
    bot_name: "Support Hero",
    language: "en",
    ai_enabled: true,
    handoff_enabled: true,
    timezone: "UTC",
  });

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Bot Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure runtime behavior and engine parameters.</p>
        </header>

        <div className="space-y-6">
          {/* General Config */}
          <section className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Engine Configuration</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Primary Language</label>
                  <select 
                    className="w-full border border-slate-200 rounded p-2 text-sm outline-none focus:border-blue-500"
                    value={config.language}
                  >
                    <option value="en">English (US)</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Timezone</label>
                  <select className="w-full border border-slate-200 rounded p-2 text-sm outline-none focus:border-blue-500">
                    <option>UTC+00:00</option>
                    <option>IST (UTC+05:30)</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Feature Toggles */}
          <section className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">AI Intelligence</p>
                  <p className="text-xs text-slate-500">Enable NLP processing for intent recognition.</p>
                </div>
                <input type="checkbox" checked={config.ai_enabled} className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Human Handoff</p>
                  <p className="text-xs text-slate-500">Allow users to request a live agent ticket.</p>
                </div>
                <input type="checkbox" checked={config.handoff_enabled} className="w-4 h-4" />
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-red-50 border border-red-100 rounded-lg p-6">
            <h2 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-2">Danger Zone</h2>
            <p className="text-xs text-red-600 mb-4">Deleting this bot will remove all associated flows, messages, and analytics permanently.</p>
            <button className="bg-red-600 text-white text-xs font-bold px-4 py-2 rounded hover:bg-red-700 transition-colors">
              Delete Bot Instance
            </button>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}