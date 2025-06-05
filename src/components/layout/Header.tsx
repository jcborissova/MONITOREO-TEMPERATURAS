// src/components/layout/Header.tsx
import React from "react";
import { UserCircleIcon, BellIcon, CogIcon } from "@heroicons/react/24/solid";

interface HeaderProps {
  isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ isSidebarOpen }) => {
  return (
    <header
      className={`fixed top-0 h-16 flex items-center justify-between bg-white shadow-md px-4 sm:px-6 z-50 transition-all duration-300
        ${isSidebarOpen ? "left-64 w-[calc(100%-16rem)]" : "left-20 w-[calc(100%-5rem)]"}`}
    >
      {/* Title */}
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-800 whitespace-nowrap overflow-hidden text-ellipsis">
        Warehouse Monitoring
      </h1>

      {/* Actions */}
      <div className="flex items-center space-x-4 sm:space-x-6">
        {/* Notifications */}
        <button
          className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 transition"
          aria-label="Notifications"
        >
          <BellIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="hidden sm:inline text-sm">Notifications</span>
        </button>

        {/* Settings */}
        <button
          className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 transition"
          aria-label="Settings"
        >
          <CogIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="hidden sm:inline text-sm">Settings</span>
        </button>

        {/* User */}
        <div
          className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 transition cursor-pointer"
          aria-label="User"
        >
          <UserCircleIcon className="w-6 h-6 sm:w-8 sm:h-8" />
          <span className="hidden sm:inline text-sm font-medium">Welcome</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
