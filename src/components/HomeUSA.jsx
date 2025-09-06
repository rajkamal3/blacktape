"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
// import { auth } from "@/lib/firebase";
import { Button } from "primereact/button";

export default function HomeUSA() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCardClick = async (item) => {
    startTransition(() => {
      router.push(`/home/us/${item.detailsId}`);
    });
  };

  return (
    <div>
      <Button
        onClick={() => handleCardClick({ detailsId: "AAPL" })}
        size="small"
        label="Nifty 50"
        className="whitespace-nowrap !bg-[#252525] !text-white !border-none"
      />
    </div>
  );
}
