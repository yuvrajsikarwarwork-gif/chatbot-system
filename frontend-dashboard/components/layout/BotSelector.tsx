import { useBotStore } from "../../store/botStore";

export default function BotSelector() {
  const setBot = useBotStore((s) => s.setSelectedBotId);

  return (
    <select
      onChange={(e) =>
        setBot(e.target.value)
      }
    >
      <option value="1">Bot 1</option>
      <option value="2">Bot 2</option>
    </select>
  );
}
