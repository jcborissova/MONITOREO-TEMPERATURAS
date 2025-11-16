/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/ReportModal.tsx

"use client";

import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { type Room } from "../../types/types";
import {
  Thermometer,
  Droplet,
  History,
  FileText,
  X,
  Download,
  Server,
} from "lucide-react";

interface Props {
  rooms: (Room & {
    serverHealth?: {
      status: string;
      timestamp: string;
      uptime: number;
      environment: string;
    };
  })[];
  warehouseName: string;
  onClose: () => void;
}

const ReportModal: React.FC<Props> = ({ rooms, warehouseName, onClose }) => {
  const [options, setOptions] = useState({
    temperature: true,
    humedity: true,
    history: false,
    serverHealth: true,
  });

  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const onBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const toggleOption = (key: keyof typeof options) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isAnyOptionSelected =
    options.temperature || options.humedity || options.history || options.serverHealth;

  const handleDownload = () => {
    const summaryData = rooms.map((room) => {
       
      const entry: any = { Zona: room.name };

      if (options.temperature) entry.Temperatura = room.temperature != null ? `${room.temperature} °C` : "--";
      if (options.humedity)
        // soporta humedity/humidity
        entry.Humedad =
          (room as any).humedity != null
            ? `${(room as any).humedity}%`
            : (room as any).humidity != null
            ? `${(room as any).humidity}%`
            : "--";

      if (options.serverHealth && room.serverHealth) {
        entry.Servidor = room.serverHealth.status;
        entry.Uptime = `${Math.floor((room.serverHealth.uptime ?? 0) / 60)} min`;
        entry.Entorno = room.serverHealth.environment;
        entry.Check = new Date(room.serverHealth.timestamp).toLocaleString("es-DO");
      }

      entry.Estado = (room as any).alert
        ? "Crítico"
        : (room as any).warning
        ? "Advertencia"
        : "Normal";
      entry.Actualizado = room.updatedAt
        ? new Date(room.updatedAt as any).toLocaleString("es-DO")
        : "--";

      return entry;
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Resumen");

    if (options.history) {
      rooms.forEach((room) => {
        if (room.history?.length) {
          const historySheet = XLSX.utils.json_to_sheet(
            room.history.map((h) => ({
              Fecha: h.timestamp ? new Date(h.timestamp as any).toLocaleString("es-DO") : "--",
              Temperatura:
                h.temperature != null
                  ? `${h.temperature} °C`
                  : (h as any).temp != null
                  ? `${(h as any).temp} °C`
                  : "--",
              Humedad:
                (h as any).humedity != null
                  ? `${(h as any).humedity}%`
                  : (h as any).humidity != null
                  ? `${(h as any).humidity}%`
                  : "--",
            }))
          );
          XLSX.utils.book_append_sheet(
            wb,
            historySheet,
            `Hist - ${room.name.slice(0, 25)}`
          );
        }
      });
    }

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `Reporte_${warehouseName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    onClose();
  };

  return (
    <div
      ref={backdropRef}
      onMouseDown={onBackdrop}
      className="fixed inset-0 z-[99999] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center px-0 sm:px-4"
      aria-modal="true"
      role="dialog"
      aria-label="Generar reporte"
    >
      <div
        className="
          w-full sm:max-w-2xl
          max-h-[88dvh]
          bg-white rounded-t-2xl sm:rounded-2xl shadow-xl
          ring-1 ring-black/5 border border-gray-100
          flex flex-col overflow-hidden
          pb-[env(safe-area-inset-bottom)]
          animate-fade-in
        "
      >
        {/* Header (sticky) */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-4 sm:px-6 py-3">
          <div className="sm:hidden flex items-center justify-center pb-1">
            <div className="h-1.5 w-12 rounded-full bg-gray-300" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-6 h-6 text-blue-600 shrink-0" />
              <h2 className="text-base sm:text-xl font-semibold text-gray-800 truncate">
                Generar Reporte
                <span className="block text-xs sm:text-sm font-normal text-gray-500 truncate">
                  {warehouseName}
                </span>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-red-500 transition"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body con scroll propio */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4">
          <div className="text-sm text-gray-700">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Selecciona los datos que deseas incluir
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 border cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.temperature}
                  onChange={() => toggleOption("temperature")}
                />
                <Thermometer className="w-5 h-5 text-red-500" />
                <span className="truncate">Temperatura</span>
              </label>

              <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 border cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.humedity}
                  onChange={() => toggleOption("humedity")}
                />
                <Droplet className="w-5 h-5 text-blue-500" />
                <span className="truncate">Humedad</span>
              </label>

              <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 border cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.serverHealth}
                  onChange={() => toggleOption("serverHealth")}
                />
                <Server className="w-5 h-5 text-green-600" />
                <span className="truncate">Estado del Servidor</span>
              </label>

              <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 border cursor-pointer sm:col-span-2">
                <input
                  type="checkbox"
                  checked={options.history}
                  onChange={() => toggleOption("history")}
                />
                <History className="w-5 h-5 text-gray-600" />
                <span className="truncate">Historial detallado por zona</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer (sticky) */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleDownload}
              disabled={!isAnyOptionSelected}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-md text-sm font-medium flex items-center justify-center gap-2 shadow transition
                ${
                  isAnyOptionSelected
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
            >
              <Download className="w-5 h-5" />
              Descargar XLSX
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
