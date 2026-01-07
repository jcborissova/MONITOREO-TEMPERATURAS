/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import NotificationBell from "../notifications/NotificationBell";
import AuthService from "../../services/auth.service";
import AgrofemLogo from "../../assets/images/agrofem-logo.png";

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = () => {
  const [displayName, setDisplayName] = useState("Usuario");

  useEffect(() => {
    const user: any = AuthService.getCurrentUser();
    if (user) {
      const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      setDisplayName(full || user.email || "Usuario");
    }
  }, []);

  return (
    <header
      className="
        w-full
        bg-white/95
        backdrop-blur-md
        border-b border-gray-200
        shadow-sm
        shrink-0
      "
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-16 gap-3">

          {/* Logo */}
          <img
            src={AgrofemLogo}
            alt="Agrofem Logo"
            className="h-9 w-auto object-contain"
          />

          {/* TITLE */}
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              Warehouse Monitoring
            </h1>
            <p className="hidden sm:block text-xs text-gray-500 truncate">
              Panel de control · Sensores · Alertas
            </p>
          </div>

          {/* RIGHT SIDE CONTENT */}
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />

            <div className="hidden sm:flex items-center gap-2 rounded-full border px-3 py-1.5">
              <UserCircleIcon className="w-7 h-7 text-gray-500" />
              <span className="text-sm font-medium truncate max-w-[150px]">
                {displayName}
              </span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
