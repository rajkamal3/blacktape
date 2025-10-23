import { create } from "zustand";
import { watchlist } from "@/data/watchlist";
import { sp500Tier1 } from "@/data/sp500Tier1";

export const useGlobalStore = create((set) => ({
  indexGlobal: watchlist,
  usIndexGlobal: sp500Tier1,
  dropdownActiveIndex: { name: "Watchlist 1", code: "WL1" },
  usDropdownActiveIndex: { name: "S&P 500 - Tier 1 (Top 100)", code: "SP500" },
  companySummary: {},
  country: "india",
  displayRandomButtonInDetailsPage: false,

  setIndexGlobal: (indexGlobal) => set({ indexGlobal }),
  setUsIndexGlobal: (usIndexGlobal) => set({ usIndexGlobal }),
  setDropdownActiveIndex: (dropdownActiveIndex) => set({ dropdownActiveIndex }),
  setUsDropdownActiveIndex: (usDropdownActiveIndex) =>
    set({ usDropdownActiveIndex }),
  setCompanySummary: (companySummary) => set({ companySummary }),
  setCountry: (country) => set({ country }),
  setDisplayRandomButtonInDetailsPage: (displayRandomButtonInDetailsPage) =>
    set({ displayRandomButtonInDetailsPage })
}));
