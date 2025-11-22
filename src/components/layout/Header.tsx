/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Bars3Icon, UserCircleIcon } from "@heroicons/react/24/solid";
import NotificationBell from "../notifications/NotificationBell";
import AuthService from "../../services/auth.service";

// 👉 LOGO DE AGROFEM (ruta real que me diste)
import AgrofemLogo from "../../assets/images/agrofem-logo.png";

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

      if (full) setDisplayName(full);
      else if (user.email) setDisplayName(user.email);
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="mx-auto max-w-screen-2xl px-3 sm:px-4">
        
        <div className="h-14 sm:h-16 flex items-center gap-3">

          {/* Mobile toggle */}
          <button
            onClick={toggleSidebar}
            className="flex-shrink-0 p-2 rounded-md hover:bg-gray-100 text-gray-600 lg:hidden"
            aria-label="Abrir menú lateral"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          {/* Logo Agrofem */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center">
              <img
                src={AgrofemLogo}
                alt="Agrofem Logo"
                className="h-9 sm:h-11 w-auto object-contain"
              />
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 truncate">
              Warehouse Monitoring
            </h1>

            <p className="hidden sm:block text-[11px] text-gray-500 truncate">
              Panel de control · Temperatura · Humedad · Alertas
            </p>
          </div>

          {/* Right icons */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">

            <NotificationBell />

            {/* User */}
            <button
              type="button"
              className="
                hidden sm:inline-flex
                items-center gap-2
                rounded-full border border-gray-200 bg-white
                px-3 py-2
                hover:border-brand-primary hover:bg-brand-soft/70 hover:text-brand-primary
                transition text-gray-700
              "
            >
              <UserCircleIcon className="w-7 h-7 text-gray-500" />

              <span className="text-sm font-medium truncate max-w-[180px]">
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
