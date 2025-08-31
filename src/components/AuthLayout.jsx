"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import Header from "@/components/Header";
import Spinner from "@/components/Spinner";

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
      <div
        className="flex justify-center items-center"
        style={{
          height: "calc(100vh - 50px)"
        }}
      >
        <Spinner />
      </div>
    );

  return (
    <div>
      <Header user={user} />

      <main>{children}</main>
    </div>
  );
}
