import { useState } from "react";
import { Integration } from "../../pages/integrations";

interface IntegrationFormProps {
  item: Integration | null;
  onSave: (config: Record<string, any>) => void;
}

export default function IntegrationForm({ item, onSave }: IntegrationFormProps) {
  const [value, setValue] = useState("");

  if (!item) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center text-gray-500 bg-gray-50">
        Select an integration from the sidebar to configure.
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-white">
      <h2 className="text-xl font-bold text-gray-900 mb-4 capitalize">
        {item.channel} Configuration
      </h2>

      <div className="flex items-center gap-3 max-w-md">
        <input
          className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          placeholder="Enter configuration or API Key..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />

        <button
          className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium whitespace-nowrap"
          onClick={() => onSave({ value })}
        >
          Save
        </button>
      </div>
    </div>
  );
}