import React, { useContext, useState, useRef, useEffect } from "react";
import {
  ChevronRightIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon
} from "@heroicons/react/24/solid";
import { bravoLocations } from "../../../data/BravoLocations";
import { WeatherContext } from "../../../context/WeatherContext";

const WarehouseList: React.FC = () => {
  const { openWarehousePlan } = useContext(WeatherContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pos = useRef({ x: 0, y: 0, left: 20, top: 80 });

  const [style, setStyle] = useState({ left: 20, top: 80 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !cardRef.current) return;
  
      const dx = e.clientX - pos.current.x;
      const dy = e.clientY - pos.current.y;
  
      const newLeft = pos.current.left + dx;
      const newTop = pos.current.top + dy;
  
      adjustPosition(newLeft, newTop);
    };
  
    const handleResize = () => {
      // Reajusta posición al cambiar tamaño de pantalla
      const { left, top } = style;
      adjustPosition(left, top);
    };
  
    const stopDrag = () => {
      dragging.current = false;
    };
  
    const adjustPosition = (newLeft: number, newTop: number) => {
      const panel = cardRef.current;
      if (!panel) return;
  
      const panelRect = panel.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
  
      const maxLeft = vw - panelRect.width - 8;
      const maxTop = vh - panelRect.height - 8;
  
      const clampedLeft = Math.min(Math.max(8, newLeft), maxLeft);
      const clampedTop = Math.min(Math.max(8, newTop), maxTop);
  
      setStyle({ left: clampedLeft, top: clampedTop });
    };
  
    window.addEventListener("resize", handleResize);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopDrag);
  
    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopDrag);
    };
  }, [style]);  

  const startDrag = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    dragging.current = true;
    pos.current = {
      x: e.clientX,
      y: e.clientY,
      left: style.left,
      top: style.top
    };
  };

  const filteredWarehouses = bravoLocations.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      ref={cardRef}
      className="absolute z-[20] w-[92vw] max-w-sm sm:w-auto sm:max-w-xs"
      style={{ ...style, position: "absolute", touchAction: "none" }}
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div
          onMouseDown={startDrag}
          className="relative flex items-center p-3 border-b bg-blue-50 cursor-move"
        >
          <div className="flex items-center gap-3 pr-8 w-full">
            <img
              src="/assets/images/bravo.png"
              alt="Bravo Logo"
              className="w-8 h-8 rounded-full object-contain border"
            />
            <span className="text-sm sm:text-base font-bold text-gray-800 whitespace-nowrap truncate">
              Supermercados Bravo
            </span>
          </div>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-blue-600 transition"
          >
            {isMinimized ? (
              <PlusIcon className="w-5 h-5" />
            ) : (
              <MinusIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Contenido */}
        {!isMinimized && (
          <div className="p-3 space-y-3">
            {/* Buscador */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar sucursal..."
                className="w-full px-4 py-2 pr-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" />
            </div>

            {/* Lista */}
            <ul className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
              {filteredWarehouses.length > 0 ? (
                filteredWarehouses.map((warehouse, index) => (
                  <li
                    key={index}
                    onClick={() => openWarehousePlan(warehouse.name)}
                    className="flex items-center justify-between bg-gray-50 hover:bg-blue-100 p-3 rounded-md transition cursor-pointer border border-gray-100 group"
                  >
                    <span className="text-sm sm:text-base font-medium text-gray-800 group-hover:text-blue-600 truncate">
                      {warehouse.name}
                    </span>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  </li>
                ))
              ) : (
                <li className="text-gray-500 text-sm text-center py-2">
                  No se encontraron resultados
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
