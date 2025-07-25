import React, { useState } from "react";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import "./Header.css";

const Header = ({ user }) => {
  const [visible, setVisible] = useState(false);

  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="header-container flex justify-between items-center">
      <div className="card flex justify-content-center">
        <Sidebar
          visible={visible}
          onHide={() => setVisible(false)}
          style={{
            backgroundColor: "#2e2e2e"
          }}
        >
          <h1 className="text-2xl mb-2">
            Welcome, {user.displayName || user.email}
          </h1>

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
        </Sidebar>
        <Button icon="pi pi-arrow-right" onClick={() => setVisible(true)} />
      </div>

      <h1 className="font-bold">Blacktape</h1>

      <div>
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt="User Profile"
            style={{
              borderRadius: "50%",
              width: "35px",
              height: "35px",
              objectFit: "cover"
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Header;
