"use client";

import HomeIndia from "@/components/HomeIndia";
import HomeUSA from "@/components/HomeUSA";
import { useGlobalStore } from "@/store/globalStore";

export default function HomePage() {
  const country = useGlobalStore((state) => state.country);
  console.log(country);

  return <div>{country === "india" ? <HomeIndia /> : <HomeUSA />}</div>;
}
