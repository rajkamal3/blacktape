"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { nasdaq100 } from "@/data/nasdaq100";
import Spinner from "@/components/Spinner";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import axios from "axios";
import { formatUSCurrency } from "@/utils/formatUSCurrency";

const filterByName = (list, query) => {
  if (!query || query.length <= 2) return [];

  return list.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );
};

export default function HomeUS() {
  const [user, setUser] = useState(null);
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [sortOrderAsc, setSortOrderAsc] = useState(true);

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useRef(null);

  const filteredData = filterByName(nasdaq100, query);

  const summaryCacheKey = `cache_us_summary`;

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

      const results = [];
      let failedIds = [];

      try {
        for (const company of nasdaq100) {
          try {
            const res = await axios.get(
              `${base}/api/proxy?id=${company.detailsId}&type=usSummary`
            );

            if (res?.data && typeof res === "object") {
              results.push({
                ...res?.data.FormattedQuoteResult.FormattedQuote[0],
                detailsId: company.detailsId
              });
            } else {
              console.warn(`🟡 No usable data for ID: ${company.detailsId}`);
              failedIds.push(company.detailsId);
            }
          } catch (err) {
            console.warn(`❌ Failed for ID: ${company.detailsId}`, err.message);
            failedIds.push(company.detailsId);
          }
        }

        setDataList(results);

        localStorage.setItem(
          summaryCacheKey,
          JSON.stringify({
            timestamp: Date.now(),
            data: results
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

    const shouldRefreshCache = () => {
      const cache = JSON.parse(localStorage.getItem(summaryCacheKey) || "null");
      if (!cache) return true;

      const now = new Date();

      const estNow = new Date(
        now.toLocaleString("en-US", { timeZone: "America/New_York" })
      );

      const lastFetch = new Date(cache.timestamp);

      const isMonday = estNow.getDay() === 1;
      const isAfter10AM = estNow.getHours() >= 10;

      const monday10am = new Date(estNow);
      monday10am.setHours(10, 0, 0, 0);

      if (isMonday && isAfter10AM && lastFetch < monday10am) {
        return true;
      }

      return false;
    };

    const cache = JSON.parse(localStorage.getItem(summaryCacheKey) || "null");

    if (cache && !shouldRefreshCache()) {
      console.log("📦 Using cached usSummary data");
      setDataList(cache.data);
      setLoading(false);
    } else {
      fetchAll();
    }
  }, [user]);

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

  const handleCardClick = async (item) => {
    startTransition(() => {
      router.push(`/home/us/${item.detailsId}`);
    });
  };

  if (isPending || loading)
    return (
      <div
        className="flex justify-center items-center bg-[var(--background)]"
        style={{
          height: "calc(100vh - 50px)"
        }}
      >
        <Spinner />
      </div>
    );

  const sortBy = (target) => {
    const raw = localStorage.getItem(summaryCacheKey);
    const parsed = JSON.parse(raw);
    const parsedData = parsed.data;

    let sorted;

    if (target === "name") {
      sorted = [...parsedData].sort((a, b) => {
        return sortOrderAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      });

      setSortOrderAsc(!sortOrderAsc);
    }

    if (target === "change") {
      const parsePct = (val) => {
        if (val == null) return 0;
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          return parseFloat(val.replace("%", "").replace("+", "").trim()) || 0;
        }
        return 0;
      };

      sorted = [...parsedData].sort((a, b) => {
        const aVal = parsePct(a.change_pct);
        const bVal = parsePct(b.change_pct);

        return sortOrderAsc ? aVal - bVal : bVal - aVal;
      });

      setSortOrderAsc(!sortOrderAsc);
    }

    if (target === "valuation") {
      const parseMktCap = (val) => {
        if (!val) return 0;
        if (typeof val === "number") return val;

        let str = val.toString().trim().toUpperCase();

        let num = parseFloat(str.replace(/[^0-9.]/g, ""));
        if (isNaN(num)) return 0;

        if (str.endsWith("T")) {
          return num * 1e12;
        } else if (str.endsWith("B")) {
          return num * 1e9;
        } else if (str.endsWith("M")) {
          return num * 1e6;
        } else if (str.endsWith("K")) {
          return num * 1e3;
        }

        return num;
      };

      sorted = [...parsedData].sort((a, b) => {
        const aVal = parseMktCap(a.mktcapView);
        const bVal = parseMktCap(b.mktcapView);

        return sortOrderAsc ? aVal - bVal : bVal - aVal;
      });

      setSortOrderAsc(!sortOrderAsc);
    }

    if (target === "pe") {
      sorted = [...parsedData].sort((a, b) => {
        return sortOrderAsc
          ? Number(a.pe) - Number(b.pe)
          : Number(b.pe) - Number(a.pe);
      });

      setSortOrderAsc(!sortOrderAsc);
    }

    if (target === "revenue") {
      const parseRevenue = (val) => {
        if (!val) return 0;
        if (typeof val === "number") return val;

        let str = val.toString().trim().toUpperCase();

        let num = parseFloat(str.replace(/[^0-9.]/g, ""));
        if (isNaN(num)) return 0;

        if (str.endsWith("T")) {
          return num * 1e12;
        } else if (str.endsWith("B")) {
          return num * 1e9;
        } else if (str.endsWith("M")) {
          return num * 1e6;
        } else if (str.endsWith("K")) {
          return num * 1e3;
        }

        return num;
      };

      sorted = [...parsedData].sort((a, b) => {
        const aVal = parseRevenue(a.revenuettm);
        const bVal = parseRevenue(b.revenuettm);

        return sortOrderAsc ? aVal - bVal : bVal - aVal;
      });

      setSortOrderAsc(!sortOrderAsc);
    }

    if (target === "closenessToLow") {
      sorted = [...parsedData].sort((a, b) => {
        return sortOrderAsc
          ? (Number(a.last) - Number(a.yrloprice)) / Number(a.yrloprice) -
              (Number(b.last) - Number(b.yrloprice)) / Number(b.yrloprice)
          : (Number(b.last) - Number(b.yrloprice)) / Number(b.yrloprice) -
              (Number(a.last) - Number(a.yrloprice)) / Number(a.yrloprice);
      });

      setSortOrderAsc(!sortOrderAsc);
    }

    setDataList(sorted);

    localStorage.setItem(
      summaryCacheKey,
      JSON.stringify({ data: sorted, expiry: parsed.expiry })
    );
  };

  return (
    <div className="p-4 bg-[var(--background)]">
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

      <Dialog
        header={"Search and Sort"}
        visible={filtersVisible}
        onHide={() => {
          if (!filtersVisible) return;
          setFiltersVisible(false);
        }}
        style={{
          width: "50vw",
          border: "none"
        }}
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
        headerClassName="!bg-[#101010] !text-white !border-none"
        contentClassName="!bg-[#101010] !text-white !border-none"
      >
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-1 max-w-5xl mx-auto mb-4">
          <Button
            label="Search"
            onClick={() => setSearchVisible(true)}
            icon="pi pi-search"
            iconPos="right"
            size="small"
            className="!bg-[#252525] !text-white !border-none"
          />

          <Button
            label="Random Stock"
            onClick={() =>
              handleCardClick(
                nasdaq100[Math.floor(Math.random() * 100)],
                "search"
              )
            }
            icon="pi pi-compass"
            iconPos="right"
            size="small"
            className="!bg-[#252525] !text-white !border-none"
          />
        </div>

        <div className="mb-4">
          <h2 className="text-m font-bold mb-1">Sort By</h2>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-1 max-w-5xl mx-auto">
            <Button
              onClick={() => sortBy("name")}
              label="Name"
              size="small"
              className="!bg-[#252525] !text-white !border-none"
            />
            <Button
              onClick={() => sortBy("change")}
              label="Day Change"
              size="small"
              className="!bg-[#252525] !text-white !border-none"
            />
            <Button
              onClick={() => sortBy("valuation")}
              label="Valuation"
              size="small"
              className="!bg-[#252525] !text-white !border-none"
            />

            <Button
              onClick={() => sortBy("pe")}
              label="PE"
              size="small"
              className="!bg-[#252525] !text-white !border-none"
            />
            <Button
              onClick={() => sortBy("revenue")}
              label="Revenue"
              size="small"
              className="!bg-[#252525] !text-white !border-none"
            />
            <Button
              onClick={() => sortBy("closenessToLow")}
              label="From 52W Low"
              size="small"
              className="!bg-[#252525] !text-white !border-none"
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
        style={{
          width: "50vw",
          border: "none"
        }}
        headerClassName="!bg-[#101010] !text-white !border-none"
        contentClassName="!bg-[#101010] !text-white !border-none"
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
      >
        <div className="p-4 max-w-md mx-auto">
          <InputText
            placeholder="Search by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full p-2 border-none !border-0 !bg-[#252525] rounded-lg mb-4"
          />

          <ul className="space-y-2 mt-2">
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <li
                  key={item.detailsId}
                  className="p-3 bg-[#252525] rounded-lg hover:bg-gray-600"
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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {dataList.map((item, index) => (
          <div
            key={index}
            className="bg-zinc-900 text-white p-4 rounded-lg"
            onClick={() => handleCardClick(item)}
            style={{
              backgroundColor: "#101010",
              color: "#ffffff"
            }}
          >
            <div className="border-b border-zinc-700 pb-2">
              <h2 className="text-md font-semibold">
                {item.name || "Unnamed Entity"}
              </h2>

              <h2 className="text-xs font-semibold">
                {`${formatUSCurrency(item.last)} (${item.change_pct})` || ``}
              </h2>
            </div>

            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="py-3 w-1/3">
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-xxs">52W Low</span>
                      <span>
                        {formatUSCurrency(Number(item.yrloprice)) || `-`}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 w-1/3">
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-xxs">
                        From 52W Low
                      </span>
                      <span>
                        {(
                          ((Number(item.last) - Number(item.yrloprice)) /
                            Number(item.yrloprice)) *
                          100
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                  </td>

                  <td className="py-3 w-1/3">
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-xxs">52W High</span>
                      <span>
                        {formatUSCurrency(Number(item.yrhiprice)) || `-`}
                      </span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="py-3 pt-0 w-1/3 pb-0">
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-xxs">Valuation</span>
                      <span>{item.mktcapView || `-`}</span>
                    </div>
                  </td>

                  <td className="py-3 pt-0 w-1/3 pb-0">
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-xxs">
                        Revenue (TTM)
                      </span>
                      <span>{item.revenuettm || `-`}</span>
                    </div>
                  </td>

                  <td className="py-3 pt-0 w-1/3 pb-0">
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-xxs">PE</span>
                      <span>{item.pe || `-`}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
