import React from "react";
import { Bars3Icon, UserCircleIcon } from "@heroicons/react/24/solid";
import NotificationBell from "../notifications/NotificationBell";

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-20 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm px-4 sm:px-8">
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center p-2 rounded-md hover:bg-gray-100 text-gray-600 lg:hidden"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 truncate">
        Warehouse Monitoring
      </h1>

      <div className="flex items-center gap-6">
        <NotificationBell />
        <div className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition cursor-pointer">
          <UserCircleIcon className="w-8 h-8 text-gray-600" />
          <span className="hidden sm:inline text-sm font-medium">
            Bienvenido <span className="font-semibold">Admin</span>
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
