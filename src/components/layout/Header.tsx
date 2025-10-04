import React, { useState, useRef, useEffect } from "react";
import {
  UserCircleIcon,
  BellIcon,
  ExclamationTriangleIcon,
  CloudIcon,
  ChartBarIcon,
} from "@heroicons/react/24/solid";

interface HeaderProps {
  isSidebarOpen: boolean;
}

const notifications = [
  {
    title: "Alerta crítica",
    description: "Temperatura fuera de rango en Cuarto Frío 2",
    time: "Hace 10 min",
    type: "critical",
    icon: <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />,
  },
  {
    title: "Sensor actualizado",
    description: "Nuevo sensor agregado en Despacho Frío",
    time: "Ayer",
    type: "info",
    icon: <CloudIcon className="w-5 h-5 text-blue-500" />,
  },
  {
    title: "Reporte generado",
    description: "El reporte diario de productividad está disponible",
    time: "Hoy 08:00 AM",
    type: "success",
    icon: <ChartBarIcon className="w-5 h-5 text-green-500" />,
  },
];

const Header: React.FC<HeaderProps> = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header
      className="h-20 flex items-center justify-between 
        bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm 
        px-4 sm:px-6 z-50 transition-all duration-300 w-full"
    >
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 whitespace-nowrap">
        Warehouse Monitoring
      </h1>

      <div className="flex items-center gap-6 relative" ref={dropdownRef}>
        {/* Notificaciones */}
        <div className="relative flex items-center">
          <button
            onClick={() => setOpen(!open)}
            className="relative flex items-center justify-center rounded-full hover:bg-gray-100 p-2 transition"
          >
            <BellIcon className="w-6 h-6 text-gray-700" />
            <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-semibold rounded-full px-1 shadow">
              {notifications.length}
            </span>
          </button>

          {open && (
            <div
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50
              transform transition-all duration-200 origin-top animate-slideDown"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-700 text-sm">Notificaciones</span>
                <button className="text-xs text-blue-600 hover:underline font-medium">
                  Marcar todas
                </button>
              </div>
              <ul className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                {notifications.map((n, idx) => (
                  <li
                    key={idx}
                    className="p-3 flex items-start gap-3 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        n.type === "critical"
                          ? "bg-red-100"
                          : n.type === "warning"
                          ? "bg-yellow-100"
                          : n.type === "success"
                          ? "bg-green-100"
                          : "bg-blue-100"
                      }`}
                    >
                      {n.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{n.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{n.description}</p>
                      <p className="text-xs text-blue-600 font-medium mt-1">{n.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-2 text-center text-sm text-blue-600 hover:underline border-t cursor-pointer">
                Ver todas
              </div>
            </div>
          )}
        </div>

        {/* Usuario */}
        <div className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition cursor-pointer">
          <UserCircleIcon className="w-7 h-7 text-gray-600" />
          <span className="hidden sm:inline text-sm font-medium">
            Bienvenido <span className="font-semibold"></span>
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
