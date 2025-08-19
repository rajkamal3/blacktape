import { create } from "zustand";
import { watchlist } from "@/data/watchlist";

export const useGlobalStore = create((set) => ({
  indexGlobal: watchlist,
  dropdownActiveIndex: { name: "Watchlist 1", code: "WL1" },

  setIndexGlobal: (indexGlobal) => set({ indexGlobal }),
  setDropdownActiveIndex: (dropdownActiveIndex) => set({ dropdownActiveIndex })
}));
