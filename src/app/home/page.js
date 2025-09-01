"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import AddCompanyDialog from "@/components/AddCompanyDialog";
import axios from "axios";
import { useGlobalStore } from "@/store/globalStore";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { nifty50 } from "@/data/nifty50";
import { niftyNext50 } from "@/data/niftyNext50";
import { niftyMidcap150 } from "@/data/niftyMidcap150";
import { niftySmallCap250 } from "@/data/niftySmallcap250";
import { watchlist } from "@/data/watchlist";
import { Button } from "primereact/button";
import Spinner from "@/components/Spinner";
import { formatIndianCurrency } from "@/utils/formatIndianCurrency";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";

const indices = [
  { name: "Watchlist 1", code: "WL1" },
  { name: "Nifty 50", code: "N50" },
  { name: "Nifty Next 50", code: "NN50" },
  { name: "Nifty Midcap 150", code: "NM150" },
  { name: "Nifty Smallcap 250", code: "NS250" }
];

const nifty500 = [
  ...nifty50,
  ...niftyNext50,
  ...niftyMidcap150,
  ...niftySmallCap250
];

const filterByName = (list, query) => {
  if (!query || query.length <= 2) return [];

  return list.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );
};

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [sortOrderAsc, setSortOrderAsc] = useState(true);
  const [query, setQuery] = useState("");

  const filteredData = filterByName(nifty500, query);

  const indexGlobal = useGlobalStore((state) => state.indexGlobal);
  const setIndexGlobal = useGlobalStore((state) => state.setIndexGlobal);
  const setCompanySummary = useGlobalStore((state) => state.setCompanySummary);

  const dropdownActiveIndex = useGlobalStore(
    (state) => state.dropdownActiveIndex
  );
  const setDropdownActiveIndex = useGlobalStore(
    (state) => state.setDropdownActiveIndex
  );

  const storageKey = dropdownActiveIndex
    ? `companies_${dropdownActiveIndex.code}`
    : null;

  const router = useRouter();
  const toast = useRef(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleCardClick = async (item, source = "home") => {
    if (source === "search") {
      try {
        const res = await axios.get(
          `https://priceapi.moneycontrol.com/pricefeed/nse/equitycash/${item.summaryId}`
        );

        if (res?.data?.data && typeof res.data.data === "object") {
          setCompanySummary(res.data.data);
        } else {
          console.warn(`🟡 No usable data for ID: ${company.summaryId}`);
          failedIds.push(item.summaryId);
        }
      } catch (err) {
        console.warn(`❌ Failed for ID: ${company.summaryId}`, err.message);
        failedIds.push(company.summaryId);
      }

      startTransition(() => {
        router.push(`/home/${item.detailsId}`);
      });
    } else {
      startTransition(() => {
        router.push(`/home/${item.detailsId}`);
      });

      setCompanySummary(item);
    }
  };

  const sortByProximityTo52WeekLow = (results) => {
    return results
      .map((item) => {
        const current = parseFloat(item.pricecurrent);
        const low52 = parseFloat(item["52L"]);

        if (isNaN(current) || isNaN(low52) || low52 === 0) {
          return { ...item, closenessToLowPct: Infinity };
        }

        const closeness = ((current - low52) / low52) * 100;

        return { ...item, closenessToLowPct: closeness };
      })
      .sort((a, b) => a.closenessToLowPct - b.closenessToLowPct);
  };

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      const cacheKey = `companies_${dropdownActiveIndex.code}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);

        if (parsed.expiry && new Date().getTime() < parsed.expiry) {
          setDataList(parsed.data);
          setLoading(false);
          return;
        }
      }

      const results = [];
      let failedIds = [];

      try {
        for (const company of indexGlobal) {
          try {
            const res = await axios.get(
              `https://priceapi.moneycontrol.com/pricefeed/nse/equitycash/${company.summaryId}`
            );

            if (res?.data?.data && typeof res.data.data === "object") {
              results.push({
                ...res.data.data,
                detailsId: company.detailsId
              });
            } else {
              console.warn(`🟡 No usable data for ID: ${company.summaryId}`);
              failedIds.push(company.summaryId);
            }
          } catch (err) {
            console.warn(`❌ Failed for ID: ${company.summaryId}`, err.message);
            failedIds.push(company.summaryId);
          }
        }

        const sortedResults = sortByProximityTo52WeekLow(results);

        setDataList(sortedResults);

        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: sortedResults,
            expiry: endOfDay.getTime()
          })
        );

        if (failedIds.length > 0 && toast.current) {
          toast.current.show({
            severity: "warn",
            summary: "Some IDs failed",
            detail: `Failed for ${failedIds.length} compan${
              failedIds.length === 1 ? "y" : "ies"
            }:\n${failedIds.join(", ")}`,
            life: 5000
          });
        }
      } catch (critical) {
        console.error("🔥 CRITICAL failure in fetchAll:", critical.message);
        if (toast.current) {
          toast.current.show({
            severity: "error",
            summary: "Unexpected Crash",
            detail: "Something went terribly wrong while fetching data.",
            life: 5000
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, indexGlobal, dropdownActiveIndex]);

  if (!user || loading)
    return (
      <div
        className="flex justify-center items-center"
        style={{
          height: "calc(100vh - 50px)",
          fontSize: "12px",
          gap: "10px",
          flexDirection: "column"
        }}
      >
        <Spinner />
      </div>
    );

  if (isPending)
    return (
      <div
        className="flex justify-center items-center"
        style={{
          height: "calc(100vh - 50px)"
        }}
      >
        <Spinner />
      </div>
    );

  const Stat = ({ label, value, valueClass = "" }) => (
    <div className="grid grid-cols-[140px_1fr]">
      <span className="text-gray-400">{label}</span>
      <span className={`${valueClass}`}>{value ?? "N/A"}</span>
    </div>
  );

  const handleChangeIndex = (value) => {
    setDropdownActiveIndex(value);
    setLoading(true);

    if (value.code === "N50") {
      setIndexGlobal(nifty50);
    } else if (value.code === "NN50") {
      setIndexGlobal(niftyNext50);
    } else if (value.code === "NM150") {
      setIndexGlobal(niftyMidcap150);
    } else if (value.code === "NS250") {
      setIndexGlobal(niftySmallCap250);
    } else if (value.code === "WL1") {
      setIndexGlobal(watchlist);
    }
  };

  const sortBy = (target) => {
    const raw = localStorage.getItem(storageKey);
    const parsed = JSON.parse(raw);
    const parsedData = parsed.data;

    let sorted;

    if (target === "name") {
      sorted = [...parsedData].sort((a, b) => {
        return sortOrderAsc
          ? a.SC_FULLNM.localeCompare(b.SC_FULLNM)
          : b.SC_FULLNM.localeCompare(a.SC_FULLNM);
      });

      setSortOrderAsc(!sortOrderAsc);
    }

    if (target === "change") {
      sorted = [...parsedData].sort((a, b) => {
        return sortOrderAsc
          ? a.pricepercentchange - b.pricepercentchange
          : b.pricepercentchange - a.pricepercentchange;
      });

      setSortOrderAsc(!sortOrderAsc);
    }

    if (target === "valuation") {
      sorted = [...parsedData].sort((a, b) => {
        return sortOrderAsc ? a.MKTCAP - b.MKTCAP : b.MKTCAP - a.MKTCAP;
      });

      setSortOrderAsc(!sortOrderAsc);
    }

    if (target === "pe") {
      sorted = [...parsedData].sort((a, b) => {
        return sortOrderAsc ? a.PE - b.PE : b.PE - a.PE;
      });

      setSortOrderAsc(!sortOrderAsc);
    }

    if (target === "sectorPe") {
      sorted = [...parsedData].sort((a, b) => {
        return sortOrderAsc ? a.IND_PE - b.IND_PE : b.IND_PE - a.IND_PE;
      });

      setSortOrderAsc(!sortOrderAsc);
    }

    if (target === "closenessToLow") {
      sorted = [...parsedData].sort((a, b) => {
        return sortOrderAsc
          ? a.closenessToLowPct - b.closenessToLowPct
          : b.closenessToLowPct - a.closenessToLowPct;
      });

      setSortOrderAsc(!sortOrderAsc);
    }

    setDataList(sorted);

    localStorage.setItem(
      storageKey,
      JSON.stringify({ data: sorted, expiry: parsed.expiry })
    );
  };

  return (
    <div>
      <Toast ref={toast} position="top-right" />

      <div
        style={{
          position: "fixed",
          zIndex: 999,
          right: "10px",
          bottom: "10px",
          height: "60px",
          width: "60px",
          backgroundColor: "#d60017",
          borderRadius: "100px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}
        onClick={() => setFiltersVisible(true)}
      >
        <Button
          icon="pi pi-sliders-h"
          text
          style={{ color: "#ededed" }}
          size="large"
        />
      </div>

      <AddCompanyDialog
        visible={visible}
        selectedIndex={dropdownActiveIndex}
        setVisible={setVisible}
      />

      <Dialog
        header={"Search and sort"}
        visible={filtersVisible}
        onHide={() => {
          if (!filtersVisible) return;
          setFiltersVisible(false);
        }}
        style={{ width: "50vw" }}
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-1 max-w-5xl mx-auto mb-4">
          <Button
            label="Search"
            onClick={() => setSearchVisible(true)}
            icon="pi pi-search"
            iconPos="right"
            size="small"
          />

          <Button
            label="Random stock"
            onClick={() =>
              handleCardClick(
                nifty500[Math.floor(Math.random() * 500)],
                "search"
              )
            }
            icon="pi pi-compass"
            iconPos="right"
            size="small"
          />
        </div>

        <div className="mb-4">
          <h2 className="text-m font-bold mb-1">Sort By</h2>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-1 max-w-5xl mx-auto">
            <Button onClick={() => sortBy("name")} label="Name" size="small" />
            <Button
              onClick={() => sortBy("change")}
              label="Day's change"
              size="small"
            />
            <Button
              onClick={() => sortBy("valuation")}
              label="Market Cap"
              size="small"
            />

            <Button onClick={() => sortBy("pe")} label="PE" size="small" />
            <Button
              onClick={() => sortBy("sectorPe")}
              label="Sector PE"
              size="small"
            />
            <Button
              onClick={() => sortBy("closenessToLow")}
              label="From to 52W Low"
              size="small"
            />
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-m font-bold mb-1">Support Levels</h2>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-1 max-w-5xl mx-auto">
            <Button
              onClick={() => handleCardClick({ detailsId: ".NSEI" })}
              size="small"
              label="Nifty 50"
            />

            <Button
              onClick={() => handleCardClick({ detailsId: ".NN50" })}
              size="small"
              label="Nifty Next 50"
            />

            <Button
              onClick={() => handleCardClick({ detailsId: ".NIMI150" })}
              size="small"
              label="Nifty Midcap 150"
            />

            <Button
              onClick={() => handleCardClick({ detailsId: ".NISM250" })}
              size="small"
              label="Nifty Smallcap 250"
            />

            <Button
              onClick={() => handleCardClick({ detailsId: "NBES" })}
              size="small"
              label="NIFTYBEES"
            />

            <Button
              onClick={() => handleCardClick({ detailsId: "JBES" })}
              size="small"
              label="JUNIORBEES"
            />

            <Button
              onClick={() => handleCardClick({ detailsId: "NTFM" })}
              size="small"
              label="MID150BEES"
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        header={"Search"}
        visible={searchVisible}
        onHide={() => {
          if (!searchVisible) return;
          setSearchVisible(false);
        }}
        style={{ width: "50vw" }}
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
      >
        <div className="p-4 max-w-md mx-auto">
          <InputText
            placeholder="Search by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4"
          />

          <ul className="space-y-2">
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <li
                  key={item.summaryId}
                  className="p-3 border rounded-lg shadow-sm hover:bg-gray-600"
                  onClick={() => handleCardClick(item, "search")}
                >
                  <div className="font-semibold">{item.name}</div>
                </li>
              ))
            ) : (
              <>
                {query.length >= 3 && (
                  <li className="text-gray-500">No results found</li>
                )}
              </>
            )}
          </ul>
        </div>
      </Dialog>

      <div
        className="p-4"
        style={{
          backgroundColor: "#1f1f1f"
        }}
      >
        <div className="card flex justify-content-center mb-3">
          <Dropdown
            value={dropdownActiveIndex}
            onChange={(e) => handleChangeIndex(e.value)}
            options={indices}
            optionLabel="name"
            placeholder="Select an index"
            className="w-full md:w-14rem"
            style={{
              backgroundColor: "#232323",
              border: "none",
              color: "#ffffff",
              fontWeight: "bold"
            }}
          />

          {dropdownActiveIndex.code === "WL1" && (
            <Button
              label="+"
              onClick={() => setVisible(true)}
              style={{
                marginLeft: "10px",
                backgroundColor: "#d60017",
                border: "none"
              }}
            />
          )}
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {dataList.map((item, index) => (
            <div
              key={index}
              className="bg-zinc-900 text-white p-4 rounded-lg"
              onClick={() => handleCardClick(item)}
              style={{
                backgroundColor: "#232323",
                color: "#ffffff"
              }}
            >
              <h2 className="text-lg font-semibold mb-4 border-b border-zinc-700 pb-2">
                {item.SC_FULLNM || "Unnamed Entity"}
              </h2>

              <div className="grid gap-y-2 text-sm">
                <Stat
                  label="Price"
                  value={`${formatIndianCurrency(item.pricecurrent)} ${Number(
                    item.pricepercentchange
                  ).toFixed(2)}%`}
                />

                <Stat
                  label="52WL | From 52WL"
                  value={`${formatIndianCurrency(item["52L"])} | ${(
                    ((item.pricecurrent - item["52L"]) / item["52L"]) *
                    100
                  ).toFixed(2)}%`}
                />
                <Stat
                  label="Market Cap"
                  value={`${formatIndianCurrency(item.MKTCAP)} Cr`}
                />
                <Stat
                  label="PE | Sector PE"
                  value={`${item.PE} | ${item.IND_PE}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
