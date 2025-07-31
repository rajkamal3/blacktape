"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import AddCompanyDialog from "@/components/AddCompanyDialog";
import axios from "axios";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { nifty50 } from "@/data/nifty50";
import { niftySmallCap250 } from "@/data/niftySmallcap250";
import { Button } from "primereact/button";

const indices = [
  { name: "Nifty 50", code: "N50" },
  { name: "Nifty Smallcap 250", code: "NS250" },
  { name: "Watchlist 1", code: "WL1" }
];

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(nifty50);
  const [selectedIndex, setSelectedIndex] = useState(indices[0]);
  const [visible, setVisible] = useState(false);

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

  const handleCardClick = (id) => {
    startTransition(() => {
      router.push(`/home/${id}`);
    });
  };

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      const results = [];
      let failedIds = [];

      try {
        for (const company of activeIndex) {
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

        setDataList(results);

        const base =
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

        const fetchPriceMovements = async (detailsId) => {
          const response = await fetch(`${base}/api/proxy?id=${detailsId}`);
          return response.json();
        };

        const addStockPriceMovementsToResults = async () => {
          const enriched = await Promise.all(
            results.map(async (item) => {
              const id = item.detailsId;
              if (!id) return item;

              console.log("Loadinggg");

              try {
                const extraData = await fetchPriceMovements(id);
                console.log("Loadededed");
                return {
                  ...item,
                  extra: extraData.data[0]
                };
              } catch (err) {
                console.error(`Failed to fetch for ${id}:`, err);
                return item;
              }
            })
          );

          console.log(enriched);

          return enriched;
        };

        addStockPriceMovementsToResults();

        setLoading(false);

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
  }, [user, activeIndex]);

  if (!user || loading)
    return (
      <div>
        <h1>Huelling...</h1>
      </div>
    );

  if (isPending) return <div>Fetching shit...</div>;

  const Stat = ({ label, value, valueClass = "" }) => (
    <div className="grid grid-cols-[140px_1fr]">
      <span className="text-gray-400">{label}</span>
      <span className={`${valueClass}`}>{value ?? "N/A"}</span>
    </div>
  );

  const handleChangeIndex = (value) => {
    setSelectedIndex(value);

    if (value.code === "N50") {
      setActiveIndex(nifty50);
    } else if (value.code === "NS250") {
      setActiveIndex(niftySmallCap250);
    } else if (value.code === "WL1") {
      setActiveIndex([]);
    }
  };

  return (
    <div>
      <Toast ref={toast} position="top-right" />

      <AddCompanyDialog
        visible={visible}
        selectedIndex={selectedIndex}
        setVisible={setVisible}
      />

      <div
        className="p-4"
        style={{
          backgroundColor: "#1f1f1f"
        }}
      >
        <div className="card flex justify-content-center mb-3">
          <Dropdown
            value={selectedIndex}
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

          {selectedIndex.code === "WL1" && (
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
              onClick={() => handleCardClick(item.detailsId)}
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
                  value={`₹ ${item.pricecurrent} ${Number(
                    item.pricepercentchange
                  ).toFixed(2)}%`}
                />

                <Stat
                  label="52WL | From 52WL"
                  value={`₹ ${item["52L"]} | ${(
                    ((item.pricecurrent - item["52L"]) / item["52L"]) *
                    100
                  ).toFixed(2)}%`}
                />
                <Stat label="Market Cap" value={`₹ ${item.MKTCAP}`} />
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
