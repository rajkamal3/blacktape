"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { nasdaq100 } from "@/data/nasdaq100";
import Spinner from "@/components/Spinner";

export default function HomeUSA() {
  const [user, setUser] = useState(null);
  const [isPending, startTransition] = useTransition();
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
