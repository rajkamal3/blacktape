"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function GoogleLogin() {
  const router = useRouter();

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/home");
    } catch (err) {
      console.error("Google login failed:", err);
    }
  };

  return (
    <button onClick={loginWithGoogle} style={{ padding: "1rem" }}>
      Sign in with Google
    </button>
  );
}
