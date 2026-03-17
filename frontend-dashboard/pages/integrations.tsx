import { useEffect, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import IntegrationList from "../components/integrations/IntegrationList";
import IntegrationForm from "../components/integrations/IntegrationForm";
import { integrationService } from "../services/integrationService";
import { useBotStore } from "../store/botStore";

export interface Integration {
  id?: string;
  bot_id?: string;
  channel: string;
  config?: Record<string, any>;
  is_active?: boolean;
}

export default function IntegrationsPage() {
  const botId = useBotStore((s) => s.selectedBotId);
  const [list, setList] = useState<Integration[]>([]);
  const [active, setActive] = useState<Integration | null>(null);

  const load = async () => {
    if (!botId) return;

    try {
      const data = await integrationService.getAll(botId);
      setList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const save = async (config: Record<string, any>) => {
    if (!botId) return;
    if (!active) return;

    try {
      await integrationService.save(botId, active.channel, config);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, [botId]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Integrations
        </h1>

        <div className="flex flex-1 min-h-[600px] bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <IntegrationList
            list={list}
            onSelect={setActive}
          />

          <IntegrationForm
            item={active}
            onSave={save}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}