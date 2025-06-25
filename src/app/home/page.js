"use client";

import { useEffect, useState } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import Header from "@/components/Header";
import axios from "axios";
import { Dropdown } from "primereact/dropdown";
import { nifty50 } from "@/data/nifty50";
import { niftySmallCap250 } from "@/data/niftySmallcap250";

const indices = [
  { name: "Nifty 50", code: "N50" },
  { name: "Nifty Smallcap 250", code: "NS250" }
];

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCount, setErrorCount] = useState(0);
  const [errorIds, setErrorIds] = useState([]);
  const [activeIndex, setActiveIndex] = useState(nifty50);
  const [selectedIndex, setSelectedIndex] = useState(indices[0]);

  const router = useRouter();

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

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      try {
        const results = [];

        for (const company of activeIndex) {
          try {
            const res = await axios.get(
              `https://priceapi.moneycontrol.com/pricefeed/nse/equitycash/${company.moneycontrolId}`
            );

            if (res?.data?.data && typeof res.data.data === "object") {
              results.push(res.data.data);
            } else {
              console.warn(
                `🟡 No usable data for ID: ${company.moneycontrolId}`
              );
              setErrorCount((prev) => prev + 1);
              setErrorIds((prev) => [...prev, company.moneycontrolId]);
            }
          } catch (err) {
            console.warn(
              `❌ Failed for ID: ${company.moneycontrolId}`,
              err.message
            );
            setErrorCount((prev) => prev + 1);
            setErrorIds((prev) => [...prev, company.moneycontrolId]);
          }
        }

        setDataList(results);
      } catch (err) {
        console.error("🔥 Critical API Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, activeIndex]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (!user || loading)
    return (
      <div>
        <h1>Huelling...</h1>
      </div>
    );

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

      setErrorCount(0);
      setErrorIds([]);
    } else if (value.code === "NS250") {
      setActiveIndex(niftySmallCap250);

      setErrorCount(0);
      setErrorIds([]);
    }
  };

  return (
    <div className="p-4">
      <Header />

      <h1 className="text-2xl mb-2">
        Welcome, {user.displayName || user.email}
      </h1>

      {user.photoURL && (
        <img
          src={user.photoURL}
          alt="User Profile"
          style={{
            borderRadius: "50%",
            width: "100px",
            height: "100px",
            objectFit: "cover",
            marginBottom: "1rem"
          }}
        />
      )}

      <button
        onClick={handleLogout}
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          cursor: "pointer",
          border: "none",
          borderRadius: "6px",
          backgroundColor: "#e63946",
          color: "white",
          marginBottom: "2rem"
        }}
      >
        Logout
      </button>

      {errorCount > 0 && (
        <div className="text-yellow-700 bg-yellow-100 p-2 rounded mb-4">
          ⚠️ {errorCount} response{errorCount > 1 ? "s were" : " was"} invalid
          or failed to load.
          <br />❗ Failed IDs:{" "}
          <span className="font-mono text-red-700">{errorIds.join(", ")}</span>
        </div>
      )}

      <div className="card flex justify-content-center">
        <Dropdown
          value={selectedIndex}
          onChange={(e) => handleChangeIndex(e.value)}
          options={indices}
          optionLabel="name"
          placeholder="Select an index"
          className="w-full md:w-14rem"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {dataList.map((item, index) => (
          <div
            key={index}
            className="bg-zinc-900 text-white p-4 rounded-lg shadow-md"
          >
            <h2 className="text-lg font-semibold mb-4 border-b border-zinc-700 pb-2">
              {item.SC_FULLNM || "Unnamed Entity"}
            </h2>

            <div className="grid gap-y-2 text-sm">
              <Stat label="Share Price" value={`₹ ${item.pricecurrent}`} />
              <Stat label="52 Week Low" value={`₹ ${item["52L"]}`} />
              <Stat label="52 Week High" value={`₹ ${item["52H"]}`} />
              <Stat label="Market Cap" value={`₹ ${item.MKTCAP}`} />
              <Stat label="PE Ratio" value={item.PE} />
              <Stat label="Industry PE" value={item.IND_PE} />
              <Stat
                label="Day's Change"
                value={`${item.pricepercentchange}%`}
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
  );
}
