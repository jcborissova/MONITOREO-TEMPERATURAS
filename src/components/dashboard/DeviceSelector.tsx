/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SignalIcon,
  FunnelIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

interface Device {
  id: string;
  label: string;
  disabled?: boolean;
}

interface DeviceSelectorProps {
  devices: Device[];
  selected: string[];
  onChange: (selected: string[]) => void;

  /** Opcionales */
  loading?: boolean;
  placeholder?: string;
  searchable?: boolean;       // activa input de búsqueda
  showSelectAll?: boolean;    // muestra “Seleccionar todo / Limpiar”
  singleSelect?: boolean;     // selección única
  maxSelections?: number;     // límite de selección
  size?: "sm" | "md";         // tamaño de chip
  className?: string;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selected,
  onChange,
  loading = false,
  placeholder = "Buscar dispositivo…",
  searchable = true,
  showSelectAll = true,
  singleSelect = false,
  maxSelections,
  size = "md",
  className = "",
}) => {
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) => d.label.toLowerCase().includes(q));
  }, [devices, query]);

  const isSelected = (id: string) => selected.includes(id);

  const handleToggle = (id: string) => {
    if (loading) return;
    if (singleSelect) {
      onChange(isSelected(id) ? [] : [id]);
      return;
    }
    if (isSelected(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      if (maxSelections && selected.length >= maxSelections) return;
      onChange([...selected, id]);
    }
  };

  const handleSelectAll = () => {
    if (loading) return;
    const enabledIds = filtered.filter((d) => !d.disabled).map((d) => d.id);
    const limited =
      maxSelections && enabledIds.length > maxSelections
        ? enabledIds.slice(0, maxSelections)
        : enabledIds;
    onChange(limited);
  };

  const handleClear = () => {
    if (loading) return;
    onChange([]);
  };

  // Navegación por teclado (izq/der para chips)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const focusables = el.querySelectorAll<HTMLButtonElement>("button[data-chip]");
      if (!focusables.length) return;
      const currentIndex = Array.from(focusables).findIndex((b) => b === document.activeElement);
      if (e.key === "ArrowRight") {
        const next = focusables[Math.min(currentIndex + 1, focusables.length - 1)];
        next?.focus();
      }
      if (e.key === "ArrowLeft") {
        const prev = focusables[Math.max(currentIndex - 1, 0)];
        prev?.focus();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, []);

  const chipBase =
    "inline-flex items-center gap-1.5 rounded-full border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";
  const chipSize =
    size === "sm"
      ? "px-2.5 py-1 text-xs"
      : "px-3 py-1.5 text-sm";
  const chipSelected =
    "bg-blue-600 text-white border-blue-600 shadow-sm hover:bg-blue-700";
  const chipUnselected =
    "bg-white text-gray-700 border-gray-300 hover:bg-gray-50";

  return (
    <div className={className}>
      <div
        className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4"
        aria-live="polite"
      >
        {/* Header: título + acciones */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">Dispositivos</span>
            <span className="text-[11px] text-gray-500">
              {selected.length}/{maxSelections ?? filtered.length} seleccionados
            </span>
          </div>

          {showSelectAll && !singleSelect && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={loading || filtered.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                title="Seleccionar todos (filtrados)"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Seleccionar todo
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={loading || selected.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                title="Limpiar selección"
              >
                <XMarkIcon className="h-4 w-4" />
                Limpiar
              </button>
            </div>
          )}
        </div>

        {/* Buscador */}
        {searchable && (
          <div className="relative">
            <FunnelIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              aria-label="Filtrar dispositivos"
            />
          </div>
        )}

        {/* Chips */}
        <div
          ref={containerRef}
          className="flex items-center gap-2 overflow-x-auto overscroll-x-contain scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
          role="listbox"
          aria-multiselectable={!singleSelect}
          tabIndex={0}
        >
          {loading ? (
            // Skeleton chips
            <div className="flex items-center gap-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`h-8 ${size === "sm" ? "w-20" : "w-24"} rounded-full bg-gray-100 animate-pulse`}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 px-1.5">Sin resultados para “{query}”.</p>
          ) : (
            filtered.map((device) => {
              const selectedState = isSelected(device.id);
              const disabledState = !!device.disabled || (maxSelections ? !selectedState && selected.length >= maxSelections : false);

              return (
                <button
                  key={device.id}
                  data-chip
                  type="button"
                  role="option"
                  aria-selected={selectedState}
                  disabled={disabledState}
                  onClick={() => handleToggle(device.id)}
                  className={[
                    chipBase,
                    chipSize,
                    selectedState ? chipSelected : chipUnselected,
                    disabledState ? "opacity-50 cursor-not-allowed" : "",
                  ].join(" ")}
                  title={device.label}
                >
                  <SignalIcon className="w-4 h-4 opacity-90" />
                  <span className="whitespace-nowrap">{device.label}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Ayuda contextual */}
        {maxSelections && !singleSelect && (
          <p className="text-[11px] text-gray-500">
            Límite: {maxSelections} {maxSelections === 1 ? "dispositivo" : "dispositivos"}.
          </p>
        )}
      </div>
    </div>
  );
};

export default DeviceSelector;
