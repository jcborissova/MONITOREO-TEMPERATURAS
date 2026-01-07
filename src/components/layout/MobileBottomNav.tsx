/* eslint-disable @typescript-eslint/no-explicit-any */
import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  MapIcon,
  ComputerDesktopIcon,
  DocumentChartBarIcon,
  BellIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/solid";

const navItems = [
  { to: "/",             icon: <HomeIcon className="w-5 h-5" />,             label: "Inicio" },
  { to: "/warehouses",   icon: <MapIcon className="w-5 h-5" />,              label: "Zonas" },
  { to: "/devices",      icon: <ComputerDesktopIcon className="w-5 h-5" />,  label: "Equipos" },
  { to: "/report",       icon: <DocumentChartBarIcon className="w-5 h-5" />, label: "Reporte" },
  { to: "/notifications",icon: <BellIcon className="w-5 h-5" />,             label: "Alertas" },
  { to: "/users",        icon: <UserGroupIcon className="w-5 h-5" />,        label: "Usuarios" },
];

export default function MobileBottomNav({ onLogoutRequest }: { onLogoutRequest: () => void }) {
  return (
    <nav
      className="
        fixed bottom-0 inset-x-0 z-40 lg:hidden
        bg-white/95 backdrop-blur-md
        border-t border-gray-200/80
        rounded-t-3xl
        shadow-[0_-4px_16px_rgba(15,23,42,0.12)]
      "
      aria-label="Navegación principal"
    >
      <div className="mx-auto max-w-screen-md px-3 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <div className="flex items-stretch justify-between">

          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "group relative flex-1 flex flex-col items-center justify-center",
                  "gap-0.5 px-1 py-1.5 min-w-[3rem]",
                  "text-[11px] font-medium tracking-tight",
                  "transition-colors duration-200",
                  isActive ? "text-brand-primary" : "text-gray-500",
                ].join(" ")
              }
            >
              <span
                aria-hidden="true"
                className="
                  absolute top-0 left-1/2 -translate-x-1/2
                  h-0.5 w-6 rounded-full
                  bg-brand-primary opacity-0 scale-x-0
                  transition-all duration-200 origin-center
                  group-[.active]:opacity-100 group-[.active]:scale-x-100
                "
              />

              <div
                className="
                  flex items-center justify-center
                  rounded-full px-2 py-1 transition-colors duration-200
                  group-[.active]:bg-brand-soft/90
                "
              >
                {item.icon}
              </div>

              <span className="leading-none mt-0.5">{item.label}</span>
            </NavLink>
          ))}

          {/* LOGOUT BUTTON */}
          <button
            onClick={onLogoutRequest}
            className="
              group flex flex-col items-center justify-center
              gap-0.5 px-1 py-1.5 min-w-[3rem]
              text-[11px] font-medium tracking-tight
              text-gray-500 transition
              active:text-red-600
            "
          >
            <div className="flex items-center justify-center rounded-full px-2 py-1 group-active:bg-red-100">
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </div>
            <span className="leading-none mt-0.5">Salir</span>
          </button>

        </div>
      </div>
    </nav>
  );
}
