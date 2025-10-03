/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/ReportModal.tsx

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { type Room } from "../../types/types";
import {
  Thermometer,
  Droplet,
  Gauge,
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
    humidity: true,
    productivity: true,
    history: false,
    serverHealth: true,
  });

  const toggleOption = (key: keyof typeof options) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isAnyOptionSelected =
    options.temperature ||
    options.humidity ||
    options.productivity ||
    options.history ||
    options.serverHealth;

  const handleDownload = () => {
    const summaryData = rooms.map((room) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entry: any = { Zona: room.name };

      if (options.temperature) entry.Temperatura = `${room.temperature} °C`;
      if (options.humidity) entry.Humedad = room.humidity != null ? `${room.humidity}%` : "--";
      if (options.productivity) entry.Productividad = room.productivity != null ? `${room.productivity}%` : "--";

      if (options.serverHealth && room.serverHealth) {
        entry.Servidor = room.serverHealth.status;
        entry.Uptime = `${Math.floor(room.serverHealth.uptime / 60)} min`;
        entry.Entorno = room.serverHealth.environment;
        entry.Check = new Date(room.serverHealth.timestamp).toLocaleString("es-DO");
      }

      entry.Estado = room.alert ? "Crítico" : room.warning ? "Advertencia" : "Normal";
      entry.Actualizado = new Date(room.updatedAt).toLocaleString("es-DO");

      return entry;
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Resumen");

    if (options.history) {
      rooms.forEach((room) => {
        if (room.history?.length) {
          const historySheet = XLSX.utils.json_to_sheet(
            room.history.map((h) => ({
              Fecha: new Date(h.timestamp).toLocaleString("es-DO"),
              Temperatura: `${h.temperature} °C`,
              Humedad: h.humidity != null ? `${h.humidity}%` : "--",
              Productividad: h.productivity != null ? `${h.productivity}%` : "--",
            }))
          );
          XLSX.utils.book_append_sheet(wb, historySheet, `Hist - ${room.name.slice(0, 25)}`);
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
    <div className="fixed inset-0 z-[99999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 sm:p-8 animate-fade-in relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 leading-snug">
              Generar Reporte
              <span className="block text-base sm:text-lg font-normal text-gray-500">
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

        {/* Opciones */}
        <div className="text-sm text-gray-700 mb-8">
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
                checked={options.humidity}
                onChange={() => toggleOption("humidity")}
              />
              <Droplet className="w-5 h-5 text-blue-500" />
              <span className="truncate">Humedad</span>
            </label>
            <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 border cursor-pointer">
              <input
                type="checkbox"
                checked={options.productivity}
                onChange={() => toggleOption("productivity")}
              />
              <Gauge className="w-5 h-5 text-purple-500" />
              <span className="truncate">Productividad</span>
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

        {/* Botones */}
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
  );
};

export default ReportModal;
