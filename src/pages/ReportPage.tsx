/* eslint-disable @typescript-eslint/no-explicit-any */
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

  // Interpreta timestamps si existen (seg, ms o string ISO). Si no hay, devuelve NaN.
  const parseTimestamp = (record: any): number => {
    const ts =
      record?.timestamp || record?.created_at || record?.time || record?.date;
    if (!ts) return NaN;
    if (typeof ts === "number") return ts < 9999999999 ? ts * 1000 : ts;
    if (typeof ts === "string") {
      const parsed = Date.parse(ts);
      return isNaN(parsed) ? NaN : parsed;
    }
    return NaN;
  };

  // Filtra por rango SOLO si al menos un registro tiene timestamp válido.
  const filterByDateRange = (measures: Measure[]) => {
    if (!Array.isArray(measures)) return [];
    const start = new Date(dateRange.start).getTime();
    const end = new Date(dateRange.end).getTime();

    const hasAnyTimestamp = measures.some((m) => !isNaN(parseTimestamp(m)));
    if (!hasAnyTimestamp) {
      // No hay timestamps → no aplicar filtro
      return measures;
    }

    return measures.filter((m) => {
      const ts = parseTimestamp(m);
      return !isNaN(ts) && ts >= start && ts <= end;
    });
  };

  useEffect(() => {

    if (!historyData || Object.keys(historyData).length === 0) {
      setReportData([]);
      return;
    }

    const aggregated: ReportRow[] = Object.entries(historyData).map(
      ([zoneKey, measures]) => {

        const filtered = filterByDateRange(measures);

        // Si no se aplicó filtro (sin timestamps) 'filtered' == measures.
        const base = filtered.length > 0 ? filtered : [];

        if (base.length === 0) {
          return {
            Zona: zoneKey,
            "Promedio Temperatura (°C)": "—",
            "Promedio Humedad (%)": "—",
            "Temp Mín (°C)": "—",
            "Temp Máx (°C)": "—",
            "Hum. Mín (%)": "—",
            "Hum. Máx (%)": "—",
            "Último Registro": "—",
            "Total Registros": 0,
          };
        }

        const temps = base
          .map((m: any) => Number(m.temperature))
          .filter((t: number) => !isNaN(t));

        // Tu backend usa 'humedity' (con e). Dejamos también backups 'humedity' y 'hum' por si acaso.
        const hums = base
          .map((m: any) => Number(m.humedity ?? m.humedity ?? m.hum))
          .filter((h: number) => !isNaN(h));

        const avgTemp =
          temps.length > 0
            ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2)
            : "—";
        const avgHum =
          hums.length > 0
            ? (hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(2)
            : "—";

        const minTemp = temps.length ? Math.min(...temps).toFixed(1) : "—";
        const maxTemp = temps.length ? Math.max(...temps).toFixed(1) : "—";
        const minHum = hums.length ? Math.min(...hums).toFixed(1) : "—";
        const maxHum = hums.length ? Math.max(...hums).toFixed(1) : "—";

        // Último registro: si no hay timestamp, mostramos “—”
        const last = base[base.length - 1];
        const lastTs = parseTimestamp(last);
        const lastFormatted = !isNaN(lastTs)
          ? new Date(lastTs).toLocaleString("es-DO", {
              dateStyle: "short",
              timeStyle: "short",
            })
          : "—";

        const row: ReportRow = {
          Zona: zoneKey, // aquí va tu devEUI o nombre
          "Promedio Temperatura (°C)": avgTemp,
          "Promedio Humedad (%)": avgHum,
          "Temp Mín (°C)": minTemp,
          "Temp Máx (°C)": maxTemp,
          "Hum. Mín (%)": minHum,
          "Hum. Máx (%)": maxHum,
          "Último Registro": lastFormatted,
          "Total Registros": base.length,
        };

        return row;
      }
    );

    setReportData(aggregated);
  }, [dateRange, historyData]);

  return (
    <PageContainer
      title="Reporte de Promedios por Zona"
      description="Analiza los datos históricos de temperatura y humedad por zona. Exporta información detallada o promedios personalizados según tus necesidades."
    >
      {/* Controles de rango */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-8 hover:shadow-md transition-all">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <CalendarIcon className="w-5 h-5 text-gray-500" />
            Periodo de análisis:
          </label>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ start: e.target.value, end: dateRange.end })
              }
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none flex-1"
            />
            <ArrowRightIcon className="w-5 h-5 text-gray-400 hidden sm:block" />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ start: dateRange.start, end: e.target.value })
              }
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none flex-1"
            />
          </div>
        </div>

        <div className="flex justify-end w-full sm:w-auto">
          <ExportButton
            data={reportData}
            startDate={dateRange.start}
            endDate={dateRange.end}
          />
        </div>
      </div>

      {/* Tabla */}
      <ReportTable data={reportData} />
    </PageContainer>
  );
};

export default ReportPage;
