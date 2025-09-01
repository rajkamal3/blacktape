import React, { useState } from "react";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import "./Header.css";

const Header = ({ user }) => {
  const [visible, setVisible] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  const clearCache = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("companies_")) {
        localStorage.removeItem(key);
      }
    });
  };

  return (
    <div className="header-container flex justify-between items-center">
      <div className="card flex justify-content-center">
        {pathname === "/home" ? (
          <>
            <Sidebar
              visible={visible}
              onHide={() => setVisible(false)}
              style={{
                backgroundColor: "#2e2e2e",
                border: "none"
              }}
            >
              <h1 className="text-2xl mb-2">
                Welcome, {user.displayName || user.email}
              </h1>

              <div>
                <Button onClick={clearCache}>Clear Cache</Button>
              </div>

              <div>
                <Button onClick={handleLogout}>Logout</Button>
              </div>
            </Sidebar>

            <Button
              icon="pi pi-equals"
              text
              style={{ color: "#ededed" }}
              onClick={() => setVisible(true)}
            />
          </>
        ) : (
          <Button
            icon="pi pi-chevron-left"
            text
            style={{ color: "#ededed" }}
            onClick={handleBack}
          />
        )}
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
