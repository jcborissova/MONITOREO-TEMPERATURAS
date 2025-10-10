import React, { useState, useContext } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { WeatherContext } from "../../context/WeatherContext";
import type { ReportRow } from "../../utils/reportUtils";

const ReportTable: React.FC<{ data: ReportRow[] }> = ({ data }) => {
  const { historyData } = useContext(WeatherContext);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  const toggleExpand = (zone: string) => {
    setExpandedZone((prev) => (prev === zone ? null : zone));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Tabla para pantallas grandes */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-left text-sm text-gray-800">
          <thead className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 font-semibold border-b">
            <tr>
              <th className="py-3 px-4">Zona</th>
              <th className="py-3 px-4 text-right">Promedio Temp (°C)</th>
              <th className="py-3 px-4 text-right">Promedio Humedad (%)</th>
              <th className="py-3 px-4 text-right">Temp Mín</th>
              <th className="py-3 px-4 text-right">Temp Máx</th>
              <th className="py-3 px-4 text-center">Registros</th>
              <th className="py-3 px-4 text-center">Histórico</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {data.map((row, i) => {
              const zoneHistory = historyData[row.Zona] || [];
              const isExpanded = expandedZone === row.Zona;

              return (
                <React.Fragment key={i}>
                  {/* Fila principal */}
                  <tr
                    className={`transition-all duration-200 cursor-pointer ${
                      isExpanded ? "bg-gray-50" : "hover:bg-gray-50/70"
                    }`}
                    onClick={() => toggleExpand(row.Zona)}
                  >
                    <td className="py-3 px-4 font-semibold flex items-center gap-2 text-gray-700">
                      {row.Zona}
                      {isExpanded ? (
                        <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-blue-700">
                      {row["Promedio Temperatura (°C)"]}
                    </td>
                    <td className="py-3 px-4 text-right text-green-700">
                      {row["Promedio Humedad (%)"]}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {row["Temp Mín (°C)"]}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {row["Temp Máx (°C)"]}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-600 font-medium">
                      {row["Total Registros"]}
                    </td>
                    <td className="py-3 px-4 text-center text-red-600 font-semibold text-sm">
                      {isExpanded ? "Ocultar" : "Ver"}
                    </td>
                  </tr>

                  {/* Histórico expandido */}
                  {isExpanded && zoneHistory.length > 0 && (
                    <tr className="bg-white animate-fadeIn">
                      <td colSpan={7} className="p-0">
                        <div className="p-5 border-t border-gray-200">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            Histórico de {row.Zona}
                            <span className="text-xs text-gray-400 font-normal">
                              ({zoneHistory.length} registros)
                            </span>
                          </h4>

                          <div className="overflow-x-auto rounded-lg border border-gray-100">
                            <table className="min-w-full text-xs">
                              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                                <tr>
                                  <th className="py-2 px-3 text-left">Fecha</th>
                                  <th className="py-2 px-3 text-right">Temp (°C)</th>
                                  <th className="py-2 px-3 text-right">Humedad (%)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {zoneHistory.map((m, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-t border-gray-100 hover:bg-gray-50 transition-all"
                                  >
                                    <td className="py-2 px-3 text-gray-700">
                                      {new Date(m.timestamp).toLocaleString("es-DO", {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </td>
                                    <td className="py-2 px-3 text-right text-blue-700">
                                      {m.temperature.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-3 text-right text-green-700">
                                      {m.humidity?.toFixed(1) ?? "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 🧩 Vista móvil (cards) */}
      <div className="md:hidden divide-y divide-gray-100">
        {data.map((row, i) => {
          const zoneHistory = historyData[row.Zona] || [];
          const isExpanded = expandedZone === row.Zona;

          return (
            <div
              key={i}
              className={`p-4 ${
                isExpanded ? "bg-gray-50" : "bg-white"
              } transition-all duration-150`}
            >
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleExpand(row.Zona)}
              >
                <div>
                  <p className="font-semibold text-gray-800">{row.Zona}</p>
                  <p className="text-xs text-gray-500">
                    {row["Total Registros"]} registros
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {/* Info resumida */}
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-700">
                <div>
                  <p className="text-gray-500">Prom. Temp</p>
                  <p className="font-medium text-blue-700">
                    {row["Promedio Temperatura (°C)"]}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Prom. Humedad</p>
                  <p className="font-medium text-green-700">
                    {row["Promedio Humedad (%)"]}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Mín Temp</p>
                  <p>{row["Temp Mín (°C)"]}</p>
                </div>
                <div>
                  <p className="text-gray-500">Máx Temp</p>
                  <p>{row["Temp Máx (°C)"]}</p>
                </div>
              </div>

              {/* Histórico en móvil */}
              {isExpanded && zoneHistory.length > 0 && (
                <div className="mt-4 border-t border-gray-200 pt-3 animate-fadeIn">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">
                    Histórico de {row.Zona}
                  </h4>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-100">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                        <tr>
                          <th className="py-2 px-3 text-left">Fecha</th>
                          <th className="py-2 px-3 text-right">Temp</th>
                          <th className="py-2 px-3 text-right">Hum.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zoneHistory.map((m, idx) => (
                          <tr
                            key={idx}
                            className="border-t border-gray-100 hover:bg-gray-50 transition-all"
                          >
                            <td className="py-2 px-3 text-gray-700">
                              {new Date(m.timestamp).toLocaleString("es-DO", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-2 px-3 text-right text-blue-700">
                              {m.temperature.toFixed(1)}
                            </td>
                            <td className="py-2 px-3 text-right text-green-700">
                              {m.humidity?.toFixed(1) ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sin datos */}
      {data.length === 0 && (
        <div className="py-8 text-center text-gray-500 text-sm">
          No hay datos disponibles para el rango seleccionado.
        </div>
      )}
    </div>
  );
};

export default ReportTable;
