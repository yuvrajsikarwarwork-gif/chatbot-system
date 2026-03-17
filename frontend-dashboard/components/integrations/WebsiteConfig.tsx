import { useState } from "react";

export default function WebsiteConfig({ botId }: { botId: string }) {
  const [config, setConfig] = useState({
    color: "#2563eb",
    position: "right",
    welcome: "Hi! How can I help you today?"
  });

  const embedCode = `
<script>
  window.BOT_ID = "${botId}";
  window.BOT_CONFIG = ${JSON.stringify(config)};
</script>
<script src="https://cdn.bot-os.com/widget.js" async></script>
  `.trim();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    alert("Script copied to clipboard!");
  };

  return (
    <div className="p-6 bg-white border border-slate-200 rounded-lg">
      <h3 className="font-bold text-slate-800 mb-4">Web Widget Configuration</h3>
      
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Theme Color</label>
            <input 
              type="color" 
              className="w-full h-10 border border-slate-200 rounded p-1"
              value={config.color}
              onChange={(e) => setConfig({...config, color: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Widget Position</label>
            <select 
              className="w-full border border-slate-200 rounded p-2 text-sm"
              value={config.position}
              onChange={(e) => setConfig({...config, position: e.target.value})}
            >
              <option value="right">Bottom Right</option>
              <option value="left">Bottom Left</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-900 rounded p-4 relative">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Embed Script</label>
          <pre className="text-[10px] text-blue-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {embedCode}
          </pre>
          <button 
            onClick={copyToClipboard}
            className="absolute top-2 right-2 bg-slate-700 text-white text-[10px] px-2 py-1 rounded hover:bg-slate-600"
          >
            COPY
          </button>
        </div>
      </div>
    </div>
  );
}