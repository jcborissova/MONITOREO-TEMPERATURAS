import React from "react";
import { Bars3Icon, UserCircleIcon } from "@heroicons/react/24/solid";
import NotificationBell from "../notifications/NotificationBell";

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="mx-auto max-w-screen-2xl px-3 sm:px-4">
        <div className="h-14 sm:h-16 flex items-center gap-3">
          {/* Burger (solo móvil) */}
          <button
            onClick={toggleSidebar}
            className="flex-shrink-0 p-2 rounded-md hover:bg-gray-100 text-gray-600 lg:hidden"
            aria-label="Abrir menú"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          {/* Título truncable */}
          <h1 className="flex-1 min-w-0 text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
            Warehouse Monitoring
          </h1>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
            <div className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition cursor-pointer">
              <UserCircleIcon className="w-7 h-7 sm:w-8 sm:h-8 text-gray-600" />
              <span className="hidden sm:inline text-sm font-medium">
                Bienvenido <span className="font-semibold">Admin</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
