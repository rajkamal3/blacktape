import { create } from "zustand";
import { nifty50 } from "@/data/nifty50";

export const useGlobalStore = create((set) => ({
  indexGlobal: nifty50,
  dropdownActiveIndex: { name: "Nifty 50", code: "N50" },

  setIndexGlobal: (indexGlobal) => set({ indexGlobal }),
  setDropdownActiveIndex: (dropdownActiveIndex) => set({ dropdownActiveIndex })
}));
