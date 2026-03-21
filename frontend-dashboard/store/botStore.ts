import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BotState {
  selectedBotId: string | null;
  activeBotId: string | null;
  unlockedBotIds: string[];
  setSelectedBotId: (id: string | null) => void;
  setBotUnlock: (id: string) => void;
  setBotLock: (id: string) => void;
  syncUnlockedBots: (validIds: string[]) => void;
  checkLockStatus: () => void;
}

export const useBotStore = create<BotState>()(
  persist(
    (set, get) => ({
      selectedBotId: null,
      activeBotId: null,
      unlockedBotIds: [],

      setSelectedBotId: (id) => {
        if (typeof window !== "undefined") {
          if (id) {
            localStorage.setItem("activeBotId", id);
          } else {
            localStorage.removeItem("activeBotId");
          }
        }

        set({ selectedBotId: id, activeBotId: id });
      },

      setBotUnlock: (id) => {
        const current = get().unlockedBotIds;
        if (current.includes(id)) return;
        if (current.length >= 5) {
          alert(
            "Builder Limit Reached: Please lock another flow before unlocking a new one."
          );
          return;
        }
        set({ unlockedBotIds: [...current, id] });
      },

      setBotLock: (id) => {
        set({
          unlockedBotIds: get().unlockedBotIds.filter((botId) => botId !== id),
        });
      },

      syncUnlockedBots: (validIds) => {
        const current = get().unlockedBotIds;
        const cleaned = current.filter((id) => validIds.includes(id));
        if (current.length !== cleaned.length) {
          set({ unlockedBotIds: cleaned });
        }
      },

      checkLockStatus: () => {
        // Reserved for future auto-expiry logic.
      },
    }),
    { name: "active-bot-storage" }
  )
);
