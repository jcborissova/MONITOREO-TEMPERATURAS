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
  XMarkIcon,
  BellIcon,
} from "@heroicons/react/24/solid";
import AuthService from "../../services/auth.service";

interface SidebarProps {
  isOpen: boolean;           // drawer móvil
  toggleSidebar: () => void; // abre/cierra drawer móvil
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
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();

  // Colapso persistente en escritorio
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("wh_sidebar_collapsed") === "1";
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wh_sidebar_collapsed", collapsed ? "1" : "0");
    }
  }, [collapsed]);

  // Bloquea scroll cuando drawer móvil está abierto
  React.useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Cierra con Escape en móvil
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) toggleSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, toggleSidebar]);

  const handleLogout = () => {
    AuthService.logout();
    navigate("/login");
  };

  const railW = collapsed ? "lg:w-[72px]" : "lg:w-64";
  const labelCls = collapsed ? "lg:opacity-0 lg:pointer-events-none" : "lg:opacity-100";
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const motionClass = reduceMotion ? "" : "transition-all duration-300";

  return (
    <>
      {/* Overlay móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Drawer móvil */}
      <aside
        role="dialog"
        aria-modal={isOpen ? true : false}
        className={[
          "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 shadow-xl lg:hidden",
          motionClass,
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Header móvil */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
          <img src="/assets/WHLOGO.png" alt="Logo Warehouses" className="w-10 h-10 rounded-full shadow-sm" />
          <span className="text-lg font-semibold text-gray-800 truncate">Warehouses</span>
          <button
            onClick={toggleSidebar}
            className="ml-auto p-2 rounded-full text-gray-600 hover:bg-gray-100"
            aria-label="Cerrar menú"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Navegación móvil */}
        <nav className="h-[calc(100dvh-64px-64px)] overflow-y-auto px-2 py-3">
          <ul className="space-y-1">
            {NAV_ITEMS.map((it) => (
              <li key={it.to}>
                <SmartNavLink
                  to={it.to}
                  icon={it.icon}
                  label={it.label}
                  onClick={() => {
                    if (window.innerWidth < 1024) toggleSidebar();
                  }}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer móvil */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 bg-white">
          <button
            onClick={handleLogout}
            className="w-full inline-flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Sidebar escritorio (colapsable) */}
      <aside
        className={[
          "hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-[100dvh] bg-white border-r border-gray-200",
          "shadow-sm",
          railW,
          motionClass,
        ].join(" ")}
      >
        {/* Toggle colapso */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={[
            "absolute -right-3 top-20 z-10 hidden lg:inline-flex items-center justify-center",
            "bg-white border border-gray-200 rounded-full shadow-md p-1.5 text-gray-600 hover:bg-gray-50",
          ].join(" ")}
          aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-200">
          <img src="/assets/WHLOGO.png" alt="Logo Warehouses" className="w-10 h-10 rounded-full shadow-sm" />
          <span
            className={[
              "text-lg font-semibold text-gray-800 truncate origin-left",
              motionClass,
              labelCls,
            ].join(" ")}
          >
            Warehouses
          </span>
        </div>

        {/* Nav */}
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
              "w-full inline-flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600",
              motionClass,
            ].join(" ")}
            title={collapsed ? "Logout" : undefined}
            aria-label="Cerrar sesión"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span className={["font-medium truncate", labelCls].join(" ")}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

function SmartNavLink({
  to,
  label,
  icon,
  onClick,
  collapsed = false,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  collapsed?: boolean;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
          "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
          isActive ? "bg-red-50 text-red-700 active" : "", // añadimos 'active' para el selector de grupo
        ].join(" ")
      }
    >
      {/* Icono */}
      <span
        className="flex items-center justify-center rounded-md p-1.5 text-gray-600 group-hover:text-gray-900"
        aria-hidden="true"
      >
        {icon}
      </span>

      {/* Etiqueta */}
      <span
        className={[
          "text-sm font-medium truncate origin-left transition-all",
          collapsed
            ? "lg:opacity-0 lg:scale-[0.98] lg:-translate-x-2 pointer-events-none"
            : "lg:opacity-100",
        ].join(" ")}
      >
        {label}
      </span>

      {/* Barrita activa a la izquierda (controlada por la clase 'active' del parent) */}
      <ActiveBar />
    </NavLink>
  );
}

/** Barrita vertical que aparece cuando el item está activo */
function ActiveBar() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 h-full w-0 opacity-0 transition-all duration-300
                 group-[.active]:opacity-100 group-[.active]:w-0.5 group-[.active]:bg-red-500"
    />
  );
}

export default Sidebar;
