import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BotState {
  unlockedBotIds: string[]; // 📂 Array for 5 slots
  setBotUnlock: (id: string) => void;
  setBotLock: (id: string) => void;
  syncUnlockedBots: (validIds: string[]) => void; // ✅ NEW: Auto-cleanup ghosts
  checkLockStatus: () => void;
}

export const useBotStore = create<BotState>()(
  persist(
    (set, get) => ({
      unlockedBotIds: [],

      setBotUnlock: (id) => {
        const current = get().unlockedBotIds;
        if (current.includes(id)) return;
        if (current.length >= 5) {
            alert("Builder Limit Reached: Please lock another flow before unlocking a new one.");
            return;
        }
        set({ unlockedBotIds: [...current, id] });
      },

      setBotLock: (id) => {
        set({ unlockedBotIds: get().unlockedBotIds.filter(bid => bid !== id) });
      },

      // ✅ Eliminates IDs from local storage that no longer exist in the DB
      syncUnlockedBots: (validIds) => {
        const current = get().unlockedBotIds;
        const cleaned = current.filter(id => validIds.includes(id));
        if (current.length !== cleaned.length) {
            set({ unlockedBotIds: cleaned });
        }
      },

      checkLockStatus: () => {
        // Logic for auto-expiry if needed
      },
    }),
    { name: "active-bot-storage" }
  )
);