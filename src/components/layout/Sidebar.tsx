import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  MapIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ComputerDesktopIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/solid";
import AuthService from "../../services/auth.service";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    AuthService.logout();
    navigate("/login");
  };

  return (
    <aside
      className={`fixed lg:relative z-50 h-full bg-white border-r border-gray-200 shadow-sm 
        flex flex-col transition-all duration-300 
        ${isOpen ? "w-64" : "w-20"} 
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
    >
      {/* Toggle (desktop) */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 
                   p-2 rounded-full shadow-md text-gray-600 hidden lg:flex"
      >
        {isOpen ? (
          <ChevronLeftIcon className="w-5 h-5" />
        ) : (
          <ChevronRightIcon className="w-5 h-5" />
        )}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-gray-200 justify-center">
        <img
          src="/assets/WHLOGO.png"
          alt="Logo"
          className="w-12 h-12 rounded-full shadow-sm"
        />
        {isOpen && (
          <span className="text-xl font-semibold text-gray-800 truncate">
            Warehouses
          </span>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 pt-4 space-y-2">
        <SidebarLink
          to="/"
          label="Dashboard"
          icon={<HomeIcon className="w-6 h-6" />}
          isOpen={isOpen}
        />
        <SidebarLink
          to="/warehouses"
          label="Warehouses"
          icon={<MapIcon className="w-6 h-6" />}
          isOpen={isOpen}
        />
        <SidebarLink
          to="/devices"
          label="Dispositivos"
          icon={<ComputerDesktopIcon className="w-6 h-6" />}
          isOpen={isOpen}
        />
        <SidebarLink
          to="/report"
          label="Reporte"
          icon={<DocumentChartBarIcon className="w-6 h-6" />}
          isOpen={isOpen}
        />
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition w-full"
        >
          <ArrowRightOnRectangleIcon className="w-6 h-6" />
          {isOpen && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

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
        isActive
          ? "bg-red-50 text-red-600 font-semibold"
          : "text-gray-700 hover:bg-gray-100"
      }`
    }
  >
    {icon}
    {isOpen && <span className="text-base truncate">{label}</span>}
  </NavLink>
);

export default Sidebar;
