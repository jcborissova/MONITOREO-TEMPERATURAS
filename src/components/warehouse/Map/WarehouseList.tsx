// src/components/warehouse/Map/WarehouseList.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { ChevronRightIcon, MagnifyingGlassIcon, MinusIcon, PlusIcon, BuildingOfficeIcon } from "@heroicons/react/24/solid";
import { locations } from "../../../data/Locations";

const WarehouseList: React.FC = () => {
  const [q, setQ] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const data = useMemo(
    () =>
      locations.map((l) => ({
        name: l.name,
        address: l.address,
        phone: l.phone,
        hours: l.hours,
      })),
    []
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = !s ? data : data.filter((w) => w.name.toLowerCase().includes(s));
    // reset highlight si cambia listado
    if (activeIndex >= base.length) setActiveIndex(0);
    return base;
  }, [data, q, activeIndex]);

  const open = useCallback(
    (name: string) => window.dispatchEvent(new CustomEvent("open-warehouse-plan", { detail: { name } })),
    []
  );

  // Navegación con teclado ↑ ↓ Enter
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!filtered.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      open(filtered[activeIndex].name);
    }
  };

  // Auto scroll al item activo
  useEffect(() => {
    const ul = listRef.current;
    if (!ul) return;
    const li = ul.querySelectorAll("li")[activeIndex] as HTMLElement | undefined;
    if (!li) return;
    const { top, bottom } = li.getBoundingClientRect();
    const { top: ut, bottom: ub } = ul.getBoundingClientRect();
    if (bottom > ub) ul.scrollTop += bottom - ub;
    if (top < ut) ul.scrollTop -= ut - top;
  }, [activeIndex, filtered]);

  return (
    <div className="w-[88vw] max-w-[320px] sm:max-w-xs">
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
        <div className="relative flex items-center px-3 py-2 bg-blue-50">
          <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
          <span className="ml-2 font-semibold text-gray-800 text-sm">Almacenes</span>
          <button
            className="ml-auto p-1 text-gray-500 hover:text-blue-600"
            onClick={() => setMinimized((v) => !v)}
            aria-label={minimized ? "Expandir lista" : "Minimizar lista"}
          >
            {minimized ? <PlusIcon className="w-5 h-5" /> : <MinusIcon className="w-5 h-5" />}
          </button>
        </div>

        {!minimized && (
          <div className="p-3 space-y-3" onKeyDown={onKeyDown}>
            <div className="relative">
              <input
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="Buscar almacén…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Buscar almacén"
              />
              <MagnifyingGlassIcon className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400" />
            </div>

            <ul ref={listRef} className="space-y-2 max-h-60 overflow-auto pr-1">
              {filtered.map((w, i) => {
                const active = i === activeIndex;
                return (
                  <li
                    key={`${w.name}-${i}`}
                    className={`flex items-center justify-between p-3 rounded-lg border transition cursor-pointer group ${
                      active
                        ? "bg-blue-100 border-blue-200"
                        : "bg-gray-50 hover:bg-blue-50 border-gray-100 hover:border-blue-200"
                    }`}
                    onClick={() => open(w.name)}
                    onMouseEnter={() => setActiveIndex(i)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Abrir ${w.name}`}
                  >
                    <span className={`text-sm font-medium truncate ${active ? "text-blue-800" : "text-gray-800"}`}>
                      {w.name}
                    </span>
                    <ChevronRightIcon
                      className={`w-4 h-4 ${active ? "text-blue-700" : "text-gray-400 group-hover:text-blue-600"}`}
                    />
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="text-center text-sm text-gray-500 py-2">Sin resultados</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseList;
