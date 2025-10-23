/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useContext,
} from "react";
import {
  ChevronRightIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/solid";
import { WeatherContext } from "../../../context/WeatherContext";
import { locations } from "../../../data/Locations";

const WarehouseList: React.FC = () => {
  const { openWarehousePlan } = useContext(WeatherContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [style, setStyle] = useState({ left: 20, top: 80 });

  const cardRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pos = useRef({ x: 0, y: 0, left: 20, top: 80 });

  /** 🔁 Mantiene el panel dentro de los límites del viewport */
  const adjustPosition = useCallback((newLeft: number, newTop: number) => {
    const panel = cardRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxLeft = vw - rect.width - 8;
    const maxTop = vh - rect.height - 8;

    setStyle({
      left: Math.min(Math.max(8, newLeft), maxLeft),
      top: Math.min(Math.max(8, newTop), maxTop),
    });
  }, []);

  /** 🖱️ Manejo de drag & drop del panel flotante */
  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - pos.current.x;
      const dy = clientY - pos.current.y;
      adjustPosition(pos.current.left + dx, pos.current.top + dy);
    };
    const stop = () => (dragging.current = false);

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
    document.addEventListener("touchmove", move);
    document.addEventListener("touchend", stop);

    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", stop);
    };
  }, [adjustPosition]);

  const startDrag = (x: number, y: number) => {
    dragging.current = true;
    pos.current = { x, y, left: style.left, top: style.top };
  };

  /** 🧱 Almacenes tomados directamente del archivo `locations.ts` */
  const warehouses = locations.map((loc) => ({
    name: loc.name,
    address: loc.address,
    phone: loc.phone,
    hours: loc.hours,
    position: loc.position,
    imageUrl: loc.imageUrl,
  }));

  /** 🔍 Filtro de búsqueda (insensible a mayúsculas y tildes) */
  const filteredWarehouses = warehouses.filter((w) =>
    w.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .includes(
        searchQuery
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
      )
  );

  return (
    <div
      ref={cardRef}
      className="absolute z-20 w-[85vw] max-w-[280px] sm:max-w-xs transition-all duration-200"
      style={{ ...style, position: "absolute", touchAction: "none" }}
    >
      {/* Panel principal */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col max-h-[65vh] sm:max-h-[70vh] backdrop-blur-sm">
        {/* 🔹 Header (manejable con drag) */}
        <div
          onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
          onTouchStart={(e) =>
            startDrag(e.touches[0].clientX, e.touches[0].clientY)
          }
          className="relative flex items-center p-3 border-b bg-blue-50 cursor-move select-none active:bg-blue-100"
        >
          <div className="flex items-center gap-2 pr-8 w-full">
            <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm sm:text-base font-semibold text-gray-800 truncate">
              Almacenes
            </span>
          </div>
          <button
            onClick={() => setIsMinimized((p) => !p)}
            aria-label={isMinimized ? "Expandir lista" : "Minimizar lista"}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-blue-600 transition"
          >
            {isMinimized ? (
              <PlusIcon className="w-5 h-5" />
            ) : (
              <MinusIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 🔹 Cuerpo del panel */}
        {!isMinimized && (
          <div className="p-3 flex-1 overflow-y-auto space-y-3">
            {/* 🔍 Buscador */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar almacén..."
                className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base bg-gray-50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>

            {/* 🔹 Lista de almacenes */}
            <ul className="space-y-2">
              {filteredWarehouses.length > 0 ? (
                filteredWarehouses.map((warehouse, index) => (
                  <li
                    key={index}
                    onClick={() => openWarehousePlan(warehouse.name)}
                    className="flex items-center justify-between bg-gray-50 hover:bg-blue-100 p-3 rounded-lg border border-gray-100 transition cursor-pointer group"
                  >
                    <span className="text-sm sm:text-base font-medium text-gray-800 group-hover:text-blue-700 truncate">
                      {warehouse.name}
                    </span>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-700 transition" />
                  </li>
                ))
              ) : (
                <li className="text-gray-500 text-sm text-center py-3">
                  No hay almacenes disponibles
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseList;
