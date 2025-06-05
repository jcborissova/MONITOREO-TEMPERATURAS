// src/components/layout/Sidebar.tsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  MapIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/solid";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen ${
        isOpen ? "w-64" : "w-20"
      } bg-gradient-to-b from-blue-800 to-blue-900 text-white shadow-lg flex flex-col transition-all duration-300 relative`}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-blue-800 hover:bg-blue-700 p-2 rounded-full shadow-md"
      >
        {isOpen ? (
          <ChevronLeftIcon className="w-5 h-5" />
        ) : (
          <ChevronRightIcon className="w-5 h-5" />
        )}
      </button>

      {/* Logo and Brand */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-blue-700 justify-center">
        <img
          src="/assets/WHLOGO.png"
          alt="Warehouse Logo"
          className={`transition-all duration-300 bg-blue-700 rounded-full shadow p-1 ${
            isOpen ? "w-12 h-12" : "w-12 h-12"
          }`}
        />
        {isOpen && (
          <span className="text-xl font-semibold truncate leading-tight">
            Warehouses
          </span>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 pt-4 space-y-2">
        <SidebarLink
          to="/"
          label="Dashboard"
          icon={<HomeIcon className="w-6 h-6" />}
          isOpen={isOpen}
        />
        <SidebarLink
          to="/map"
          label="Map View"
          icon={<MapIcon className="w-6 h-6" />}
          isOpen={isOpen}
        />
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-blue-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-600 transition-colors w-full"
        >
          <ArrowRightOnRectangleIcon className="w-6 h-6" />
          {isOpen && (
            <span className="text-base font-medium">Logout</span>
          )}
        </button>
      </div>
    </aside>
  );
};

// SidebarLink as a clean reusable component
const SidebarLink: React.FC<{
  to: string;
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
}> = ({ to, label, icon, isOpen }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
        isActive ? "bg-blue-700" : "hover:bg-blue-600"
      }`
    }
  >
    {icon}
    {isOpen && <span className="text-base font-medium truncate">{label}</span>}
  </NavLink>
);

export default Sidebar;
