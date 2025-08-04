"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import Header from "@/components/Header";
import "@/utils/loader.css";

export default function AuthLayout({ children }) {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        router.push("/login");
      }
    });

    return () => unsub();
  }, [router]);

  if (!user)
    return (
      <div className="flex justify-center items-center h-[100vh]">
        <div className="loader"></div>
      </div>
    );

  return (
    <div>
      <Header user={user} />

      <main>{children}</main>
    </div>
  );
}
