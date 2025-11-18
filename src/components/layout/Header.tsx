/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Bars3Icon, UserCircleIcon } from "@heroicons/react/24/solid";
import NotificationBell from "../notifications/NotificationBell";
import CompanyLogo from "../../assets/images/SmartLogoBlack.png";
import AuthService from "../../services/auth.service";

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const [displayName, setDisplayName] = useState<string>("Usuario");

  useEffect(() => {
    const user = AuthService.getCurrentUser();

    if (user) {
      const first = (user as any).firstName || "";
      const last = (user as any).lastName || "";
      const full = `${first} ${last}`.trim();

      if (full && full !== "") {
        setDisplayName(full);
      } else if (user.email) {
        setDisplayName(user.email);
      } else {
        setDisplayName("Usuario");
      }
    } else {
      setDisplayName("Usuario");
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="mx-auto max-w-screen-2xl px-3 sm:px-4">
        <div className="h-14 sm:h-16 flex items-center gap-3">

          {/* Burger (móvil) */}
          <button
            onClick={toggleSidebar}
            className="flex-shrink-0 p-2 rounded-md hover:bg-gray-100 text-gray-600 lg:hidden"
            aria-label="Abrir menú lateral"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 shadow-sm flex items-center justify-center">
              <img
                src={CompanyLogo}
                alt="Smart Electric Logo"
                className="h-11 sm:h-12 md:h-14 w-auto object-contain"
              />
            </div>
          </div>

          {/* Título */}
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 truncate">
              Warehouse Monitoring
            </h1>
            <p className="hidden sm:block text-[11px] text-gray-500 truncate">
              Panel de control · temperatura, humedad y alertas
            </p>
          </div>

          {/* Acciones derecha */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">

            <NotificationBell />

            {/* Usuario */}
            <button
              type="button"
              className="
                inline-flex items-center gap-1.5 sm:gap-2
                rounded-full border border-gray-200 bg-white px-2 py-1.5 sm:px-3
                hover:border-green-200 hover:bg-green-50/70 hover:text-green-700
                transition text-gray-700
              "
            >
              <UserCircleIcon className="w-6 h-6 sm:w-7 sm:h-7 text-gray-500" />

              <span className="text-xs sm:text-sm font-medium truncate max-w-[140px] sm:max-w-[180px] ml-1">
                {displayName}
              </span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
