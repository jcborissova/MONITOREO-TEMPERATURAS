/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useContext, useEffect, useState } from "react";
import { CalendarIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { WeatherContext } from "../context/WeatherContext";
import PageContainer from "../components/layout/PageContainer";
import ExportButton from "../components/report/ExportButton";
import ReportTable from "../components/report/ReportTable";
import type { ReportRow } from "../utils/reportUtils";
import type { Measure } from "../types/types";

const ReportPage: React.FC = () => {
  const { historyData } = useContext(WeatherContext);

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [dateRange, setDateRange] = useState({ start: weekAgo, end: today });
  const [reportData, setReportData] = useState<ReportRow[]>([]);

  // 🔹 Filtro por rango de fechas
  const filterByDateRange = (measures: Measure[]) => {
    const start = new Date(dateRange.start).getTime();
    const end = new Date(dateRange.end).getTime();
    return measures.filter((m) => {
      const ts = new Date(m.timestamp).getTime();
      return ts >= start && ts <= end;
    });
  };

  // 🔹 Calcular promedios a partir del histórico
  useEffect(() => {
    if (!historyData) return;

    const aggregated: ReportRow[] = Object.entries(historyData).map(
      ([zone, measures]) => {
        const filtered = filterByDateRange(measures);
        if (filtered.length === 0)
          return {
            Zona: zone,
            "Promedio Temperatura (°C)": "—",
            "Promedio Humedad (%)": "—",
            "Temp Mín (°C)": "—",
            "Temp Máx (°C)": "—",
            "Total Registros": 0,
          };

        const temps = filtered.map((m) => m.temperature);
        const hums = filtered
          .map((m) => m.humidity)
          .filter((h) => typeof h === "number");
        const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
        const avgHum =
          hums.length > 0
            ? hums.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / hums.length
            : 0;
        const minTemp = Math.min(...temps);
        const maxTemp = Math.max(...temps);

        return {
          Zona: zone,
          "Promedio Temperatura (°C)": avgTemp.toFixed(2),
          "Promedio Humedad (%)": avgHum.toFixed(2),
          "Temp Mín (°C)": minTemp.toFixed(1),
          "Temp Máx (°C)": maxTemp.toFixed(1),
          "Total Registros": filtered.length,
        };
      }
    );

    setReportData(aggregated);
  }, [dateRange, historyData]);

  return (
    <PageContainer
      title="Reporte de Promedios por Zona"
      description="Analiza los datos históricos de temperatura y humedad por zona. Exporta información detallada o promedios personalizados según tus necesidades."
    >
      {/* Controles superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-8 hover:shadow-md transition-all">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <CalendarIcon className="w-5 h-5 text-gray-500" />
            Periodo de análisis:
          </label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange({ start: e.target.value, end: dateRange.end })
            }
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none w-[160px]"
          />
          <ArrowRightIcon className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange({ start: dateRange.start, end: e.target.value })
            }
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none w-[160px]"
          />
        </div>

        <ExportButton
          data={reportData}
          startDate={dateRange.start}
          endDate={dateRange.end}
        />
      </div>

      {/* Tabla */}
      <ReportTable data={reportData} />
    </PageContainer>
  );
};

export default ReportPage;
