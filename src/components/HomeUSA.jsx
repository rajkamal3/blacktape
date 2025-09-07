"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { nasdaq100 } from "@/data/nasdaq100";
import Spinner from "@/components/Spinner";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";

const filterByName = (list, query) => {
  if (!query || query.length <= 2) return [];

  return list.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );
};

export default function HomeUSA() {
  const [user, setUser] = useState(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filteredData = filterByName(nasdaq100, query);

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

  if (isPending)
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

  return (
    <div className="p-4 bg-[var(--background)]">
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
        {nasdaq100.map((item, index) => (
          <div
            key={index}
            className="bg-zinc-900 text-white p-4 rounded-lg"
            onClick={() => handleCardClick(item)}
            style={{
              backgroundColor: "#101010",
              color: "#ffffff"
            }}
          >
            {/* <div className="border-b border-zinc-700 pb-2"> */}
            <div>
              <h2 className="text-md font-semibold">
                {item.name || "Unnamed Entity"}
              </h2>

              {/* <h2 className="text-xs font-semibold">
                {`${formatIndianCurrency(item.pricecurrent)} (${Number(
                  item.pricepercentchange
                ).toFixed(2)}%)`}
              </h2> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
