"use client";

import { useEffect, useState } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  console.log(user);

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

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Welcome, {user.displayName || user.email}</h1>
      {user.photoURL && (
        <img
          src={user.photoURL}
          alt="User Profile"
          style={{
            borderRadius: "50%",
            width: "100px",
            height: "100px",
            objectFit: "cover",
            margin: "1rem 0"
          }}
        />
      )}
      <br />
      <button
        onClick={handleLogout}
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          cursor: "pointer",
          border: "none",
          borderRadius: "6px",
          backgroundColor: "#e63946",
          color: "white"
        }}
      >
        Logout
      </button>
    </div>
  );
}
