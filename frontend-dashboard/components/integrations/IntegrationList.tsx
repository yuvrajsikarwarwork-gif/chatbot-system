const CHANNELS = [
  { name: "whatsapp", desc: "Connect your bot to WhatsApp Business API", icon: "🟢" },
  { name: "telegram", desc: "Deploy on Telegram for instant messaging", icon: "🔵" },
  { name: "slack", desc: "Internal automation for your workspace", icon: "🟣" },
  { name: "web_widget", desc: "A floating chat bubble for your website", icon: "⚪" },
];

export default function IntegrationList({ list, onSelect }: any) {
  return (
    <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-y-auto">
      <div className="p-4 font-bold text-xs text-gray-400 uppercase tracking-widest">Available Channels</div>
      {CHANNELS.map((ch) => (
        <div
          key={ch.name}
          className="p-4 border-b border-gray-200 cursor-pointer hover:bg-white transition-all group"
          onClick={() => onSelect({ channel: ch.name })}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{ch.icon}</span>
            <div>
              <div className="font-bold text-gray-800 capitalize group-hover:text-blue-600 transition-colors">
                {ch.name.replace('_', ' ')}
              </div>
              <div className="text-xs text-gray-500 line-clamp-1">{ch.desc}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}