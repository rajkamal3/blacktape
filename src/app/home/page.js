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
              `https://priceapi.moneycontrol.com/pricefeed/nse/equitycash/${company.moneycontrolId}`
            );

            if (res?.data?.data && typeof res.data.data === "object") {
              results.push({
                ...res.data.data,
                tickertapeId: company.tickertapeId
              });
            } else {
              console.warn(
                `🟡 No usable data for ID: ${company.moneycontrolId}`
              );
              failedIds.push(company.moneycontrolId);
            }
          } catch (err) {
            console.warn(
              `❌ Failed for ID: ${company.moneycontrolId}`,
              err.message
            );
            failedIds.push(company.moneycontrolId);
          }
        }

        setDataList(results);
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
      <span className={`text-white ${valueClass}`}>{value ?? "N/A"}</span>
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
              onClick={() => handleCardClick(item.tickertapeId)}
              style={{
                backgroundColor: "#232323",
                color: "#ffffff"
              }}
            >
              <h2 className="text-lg font-semibold mb-4 border-b border-zinc-700 pb-2">
                {item.SC_FULLNM || "Unnamed Entity"}
              </h2>

              <div className="grid gap-y-2 text-sm">
                <Stat label="Share Price" value={`₹ ${item.pricecurrent}`} />
                <Stat label="52 Week Low" value={`₹ ${item["52L"]}`} />
                <Stat
                  label="From 52W Low"
                  value={`${(
                    ((item.pricecurrent - item["52L"]) / item["52L"]) *
                    100
                  ).toFixed(2)}%`}
                ></Stat>
                <Stat label="52 Week High" value={`₹ ${item["52H"]}`} />
                <Stat label="Market Cap" value={`₹ ${item.MKTCAP}`} />
                <Stat label="PE Ratio" value={item.PE} />
                <Stat label="Industry PE" value={item.IND_PE} />
                <Stat
                  label="Day's Change"
                  value={`${Number(item.pricepercentchange).toFixed(2)}%`}
                  valueClass={
                    parseFloat(item.pricepercentchange) < 0
                      ? "text-red-500"
                      : "text-green-500"
                  }
                />
                <Stat label="Sector" value={item.SC_SUBSEC} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
