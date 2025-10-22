/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useContext } from "react";
import ResponsiveTable from "../ui/ResponsiveTable";
import { WeatherContext } from "../../context/WeatherContext";
import type { ReportRow } from "../../utils/reportUtils";

const ReportTable: React.FC<{ data: ReportRow[] }> = ({ data }) => {
  const { historyData } = useContext(WeatherContext);

  // función auxiliar para mostrar fecha legible
  const parseTimestamp = (record: any): string => {
    const ts =
      record?.timestamp || record?.created_at || record?.time || record?.date;
    if (!ts) return "—";
    const date =
      typeof ts === "number"
        ? new Date(ts < 9999999999 ? ts * 1000 : ts)
        : new Date(ts);
    return !isNaN(date.getTime())
      ? date.toLocaleString("es-DO", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";
  };

  // Si no hay data, dejamos que ResponsiveTable maneje el mensaje vacío
  return (
    <ResponsiveTable
      title="Promedios por Zona"
      data={data}
      expandableKey="Zona"
      emptyMessage="No hay datos disponibles para el rango seleccionado."
      showExport={true}
      columns={[
        { key: "Zona", label: "Zona" },
        {
          key: "Promedio Temperatura (°C)",
          label: "Prom. Temp (°C)",
          align: "right",
          render: (v) => <span className="text-blue-700">{v}</span>,
        },
        {
          key: "Promedio Humedad (%)",
          label: "Prom. Humedad (%)",
          align: "right",
          render: (v) => <span className="text-green-700">{v}</span>,
        },
        { key: "Temp Mín (°C)", label: "Mín Temp", align: "right" },
        { key: "Temp Máx (°C)", label: "Máx Temp", align: "right" },
        {
          key: "Total Registros",
          label: "Registros",
          align: "center",
          render: (v) => <span className="font-medium text-gray-600">{v}</span>,
        },
      ]}
      expandedRender={(row) => {
        const zoneHistory = Array.isArray(historyData[row.Zona])
          ? historyData[row.Zona]
          : [];

        if (zoneHistory.length === 0)
          return (
            <div className="text-gray-500 text-sm">
              No hay histórico disponible para esta zona.
            </div>
          );

        return (
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              Histórico de {row.Zona}
              <span className="text-xs text-gray-400 ml-2">
                ({zoneHistory.length} registros)
              </span>
            </h4>

            <div className="overflow-y-auto max-h-72 rounded-lg border border-gray-100">
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
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 px-3 text-gray-700">
                        {parseTimestamp(m)}
                      </td>
                      <td className="py-2 px-3 text-right text-blue-700">
                        {Number(m.temperature)?.toFixed(2) ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-green-700">
                        {Number(
                          (m as any).humedity ?? (m as any).humidity
                        )?.toFixed(1) ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }}
    />
  );
};

export default ReportTable;
