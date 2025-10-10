/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useContext } from "react";
import * as XLSX from "xlsx";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import type { ReportRow } from "../../utils/reportUtils";
import { WeatherContext } from "../../context/WeatherContext";

interface ExportButtonProps {
  data: ReportRow[];
  startDate: string;
  endDate: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  startDate,
  endDate,
}) => {
  const { historyData } = useContext(WeatherContext);
  const [showModal, setShowModal] = useState(false);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [fileName, setFileName] = useState(
    `Reporte_Zonas_${startDate}_a_${endDate}`
  );

  const handleExport = () => {
    if (!data.length) {
      alert("No hay datos para exportar.");
      return;
    }

    const wb = XLSX.utils.book_new();

    // 🔹 Hoja 1: Promedios
    const filteredData =
      selectedZones.length > 0
        ? data.filter((d) => selectedZones.includes(d.Zona))
        : data;
    const ws1 = XLSX.utils.json_to_sheet(filteredData);
    XLSX.utils.book_append_sheet(wb, ws1, "Promedios");

    // 🔹 Hoja 2: Histórico
    if (includeHistory) {
      const rows: any[] = [];
      Object.entries(historyData).forEach(([zone, measures]) => {
        if (selectedZones.length && !selectedZones.includes(zone)) return;
        measures.forEach((m) => {
          rows.push({
            Zona: zone,
            Fecha: new Date(m.timestamp).toLocaleString("es-DO"),
            "Temp (°C)": m.temperature,
            "Humedad (%)": m.humidity,
          });
        });
      });
      const ws2 = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws2, "Histórico");
    }

    XLSX.writeFile(wb, `${fileName}.xlsx`);
    setShowModal(false);
  };

  return (
    <>
      {/* Botón principal */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-all duration-150 w-full sm:w-auto"
      >
        <ArrowDownTrayIcon className="w-5 h-5" />
        Exportar Excel
      </button>

      {/* Modal de configuración */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 relative">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Configurar exportación
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Personaliza la información a incluir en el archivo Excel.
            </p>

            {/* Nombre del archivo */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Nombre del archivo
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Zonas */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Zonas a incluir
              </label>
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                {data.map((r) => (
                  <label
                    key={r.Zona}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-red-600 transition"
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedZones.length === 0 ||
                        selectedZones.includes(r.Zona)
                      }
                      onChange={() =>
                        setSelectedZones((prev) =>
                          prev.includes(r.Zona)
                            ? prev.filter((z) => z !== r.Zona)
                            : [...prev, r.Zona]
                        )
                      }
                      className="accent-red-600"
                    />
                    {r.Zona}
                  </label>
                ))}
              </div>
            </div>

            {/* Incluir histórico */}
            <div className="flex items-center gap-2 mb-6">
              <input
                type="checkbox"
                checked={includeHistory}
                onChange={() => setIncludeHistory(!includeHistory)}
                className="accent-red-600"
              />
              <span className="text-sm text-gray-700">
                Incluir hoja de histórico
              </span>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleExport}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md transition-all duration-150"
              >
                Descargar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExportButton;
