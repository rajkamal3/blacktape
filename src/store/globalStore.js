import { create } from "zustand";
import { watchlist } from "@/data/watchlist";
import { sp500Top100 } from "@/data/sp500Top100";

export const useGlobalStore = create((set) => ({
  indexGlobal: watchlist,
  usIndexGlobal: sp500Top100,
  dropdownActiveIndex: { name: "Watchlist 1", code: "WL1" },
  usDropdownActiveIndex: { name: "S&P 500 (Top 100)", code: "SP500" },
  companySummary: {},
  country: "india",

  setIndexGlobal: (indexGlobal) => set({ indexGlobal }),
  setUsIndexGlobal: (usIndexGlobal) => set({ usIndexGlobal }),
  setDropdownActiveIndex: (dropdownActiveIndex) => set({ dropdownActiveIndex }),
  setUsDropdownActiveIndex: (usDropdownActiveIndex) =>
    set({ usDropdownActiveIndex }),
  setCompanySummary: (companySummary) => set({ companySummary }),
  setCountry: (country) => set({ country })
}));
