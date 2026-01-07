/* eslint-disable @typescript-eslint/no-explicit-any */
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
  BellIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import AuthService from "../../services/auth.service";

interface SidebarProps {
  isOpen: boolean;           // se mantiene por compatibilidad, pero solo usamos desktop
  toggleSidebar: () => void; // idem
}

type Item = {
  to: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: Item[] = [
  { to: "/",             label: "Dashboard",      icon: <HomeIcon className="w-5 h-5" /> },
  { to: "/warehouses",   label: "Warehouses",     icon: <MapIcon className="w-5 h-5" /> },
  { to: "/devices",      label: "Dispositivos",   icon: <ComputerDesktopIcon className="w-5 h-5" /> },
  { to: "/report",       label: "Reporte",        icon: <DocumentChartBarIcon className="w-5 h-5" /> },
  { to: "/notifications",label: "Notificaciones", icon: <BellIcon className="w-5 h-5" /> },
  { to: "/users",        label: "Usuarios",       icon: <UserGroupIcon className="w-5 h-5" /> },
];

const Sidebar: React.FC<SidebarProps> = () => {
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("wh_sidebar_collapsed") === "1";
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wh_sidebar_collapsed", collapsed ? "1" : "0");
    }
  }, [collapsed]);

  const handleLogout = () => {
    AuthService.logout();
    navigate("/login");
  };

  const railW = collapsed ? "lg:w-[72px]" : "lg:w-64";
  const labelCls = collapsed
    ? "lg:opacity-0 lg:pointer-events-none"
    : "lg:opacity-100";
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const motionClass = reduceMotion ? "" : "transition-all duration-300";

  return (
    <aside
      className={[
        "hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-[100dvh]",
        "bg-white border-r border-gray-200 shadow-sm",
        railW,
        motionClass,
        "pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)]",
      ].join(" ")}
    >
      {/* Botón colapsar */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={[
          "absolute -right-3 top-8 z-10 hidden lg:flex items-center justify-center",
          "bg-white border border-gray-200 rounded-full shadow-md p-1.5 text-gray-600 hover:bg-gray-50",
        ].join(" ")}
        aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
      >
        {collapsed ? (
          <ChevronRightIcon className="w-4 h-4" />
        ) : (
          <ChevronLeftIcon className="w-4 h-4" />
        )}
      </button>

      {/* Header sidebar */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
        <img
          src="/assets/WHLOGO.png"
          alt="Logo Warehouses"
          className="w-10 h-10 rounded-full shadow-sm"
        />
        <span
          className={[
            "text-lg font-semibold text-gray-800 truncate origin-left",
            motionClass,
            labelCls,
          ].join(" ")}
        >
          Panel de Monitoreo
        </span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((it) => (
            <li key={it.to}>
              <SmartNavLink
                to={it.to}
                icon={it.icon}
                label={it.label}
                collapsed={collapsed}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className={[
            "w-full flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition",
            collapsed ? "justify-center" : "gap-3 justify-start",
          ].join(" ")}
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          {!collapsed && "Logout"}
        </button>
      </div>
    </aside>
  );
};

function SmartNavLink({
  to,
  label,
  icon,
  collapsed = false,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  collapsed?: boolean;
}) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 transition-all",
          "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
          isActive ? "bg-brand-soft text-brand-primary active" : "",
        ].join(" ")
      }
    >
      {/* Icono */}
      <span className="flex items-center justify-center p-1.5 text-gray-600 group-hover:text-gray-900">
        {icon}
      </span>

      {/* Texto */}
      {!collapsed && (
        <span className="text-sm font-medium truncate origin-left transition-all">
          {label}
        </span>
      )}

      {/* Barra activa izquierda */}
      <ActiveBar />
    </NavLink>
  );
}

function ActiveBar() {
  return (
    <span
      aria-hidden="true"
      className="
        absolute left-0 top-0 h-full w-0 opacity-0
        transition-all duration-300
        group-[.active]:opacity-100 group-[.active]:w-1 group-[.active]:bg-brand-primary
      "
    />
  );
}

export default Sidebar;
