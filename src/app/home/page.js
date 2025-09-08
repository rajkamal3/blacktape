"use client";

import HomeIndia from "@/components/HomeIndia";
import HomeUS from "@/components/HomeUS";
import { useGlobalStore } from "@/store/globalStore";

export default function HomePage() {
  const country = useGlobalStore((state) => state.country);

  return <div>{country === "india" ? <HomeIndia /> : <HomeUS />}</div>;
}
