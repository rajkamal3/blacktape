"use client";

import { useEffect, useState } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import Header from "@/components/Header";
import axios from "axios";

const ids = [
  "YUYUY67",
  "SL23",
  "AW01",
  "AHFL",
  "AI",
  "RI",
  "SL23",
  "AW01",
  "AHFL",
  "AI"
];

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCount, setErrorCount] = useState(0);
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

        for (const id of ids) {
          try {
            const res = await axios.get(
              `https://priceapi.moneycontrol.com/pricefeed/nse/equitycash/${id}`
            );
            if (res?.data?.data && typeof res.data.data === "object") {
              results.push(res.data.data);
              console.log(results);
            } else {
              console.warn(`🟡 No usable data for ID: ${id}`);
              setErrorCount((prev) => prev + 1);
            }
          } catch (err) {
            console.warn(`❌ Failed for ID: ${id}`, err.message);
            setErrorCount((prev) => prev + 1);
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
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (!user || loading) return <p>Loading...</p>;

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
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {dataList.map((item, index) => (
          <div key={index} className="border p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-bold mb-1">
              {item.SC_FULLNM || "Unnamed Entity"}
            </h2>
            <p>{item.pricecurrent || "No description provided."}</p>
            {/* Add more fields defensively */}
            {item.updatedAt && (
              <p className="text-sm text-gray-600 mt-2">
                Last updated: {new Date(item.updatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
