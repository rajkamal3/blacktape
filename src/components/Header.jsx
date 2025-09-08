import React, { useState } from "react";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import "./Header.css";
import { useGlobalStore } from "@/store/globalStore";

const Header = ({ user }) => {
  const [visible, setVisible] = useState(false);

  const country = useGlobalStore((state) => state.country);
  const setCountry = useGlobalStore((state) => state.setCountry);

  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleBack = () => {
    // if (window.history.length > 1) {
    //   router.back();
    // } else {
    router.push("/home");
    // }
  };

  const clearCache = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("companies_")) {
        localStorage.removeItem(key);
      }
    });

    setVisible(false);

    window.location.reload();
  };

  const changeCountry = (country) => {
    setCountry(country);
    setVisible(false);
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
                backgroundColor: "#101010",
                border: "none"
              }}
            >
              <h1 className="text-2xl mb-2">
                Welcome,{" "}
                {`${user.displayName.split(" ")[0]}!` || `${user.email}`}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-1 max-w-5xl mx-auto mb-1">
                <Button
                  label={`Switch to ${country === "india" ? "US" : "India"}`}
                  onClick={() =>
                    changeCountry(country === "india" ? "us" : "india")
                  }
                  size="small"
                  style={{
                    backgroundColor: "#d60017",
                    color: "#ffffff",
                    border: "none"
                  }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-1 max-w-5xl mx-auto mb-4">
                <Button
                  label="Clear cache"
                  onClick={clearCache}
                  size="small"
                  style={{
                    backgroundColor: "#d60017",
                    color: "#ffffff",
                    border: "none"
                  }}
                />

                <Button
                  label="Logout"
                  onClick={handleLogout}
                  size="small"
                  style={{
                    backgroundColor: "#d60017",
                    color: "#ffffff",
                    border: "none"
                  }}
                />
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

      <h1 className="font-bold text-[var(--foreground)]">Blacktape</h1>

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
