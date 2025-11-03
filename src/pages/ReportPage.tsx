  /* eslint-disable prefer-const */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  import React, { useContext, useEffect, useState, useMemo } from "react";
  import { CalendarIcon, ArrowRightIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
  import { WeatherContext } from "../context/WeatherContext";
  import PageContainer from "../components/layout/PageContainer";
  import ExportButton from "../components/report/ExportButton";
  import ReportTable from "../components/report/ReportTable";
  import type { ReportRow } from "../utils/reportUtils";
  import type { Measure } from "../types/types";

  /** Utilidad: asegura que las fechas estén dentro de límites válidos */
  const normalizeRange = (start: string, end: string) => {
    const today = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Si alguna no es válida, retorna semana actual
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      const todayStr = today.toISOString().split("T")[0];
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      return { start: weekAgo, end: todayStr };
    }

    // Evita rangos invertidos
    if (endDate < startDate) return { start, end: start };

    // Evita fechas futuras
    const todayStr = today.toISOString().split("T")[0];
    if (endDate > today) return { start, end: todayStr };

    return { start, end };
  };

  const ReportPage: React.FC = () => {
    const { historyData } = useContext(WeatherContext);

    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [dateRange, setDateRange] = useState({ start: weekAgo, end: today });
    const [reportData, setReportData] = useState<ReportRow[]>([]);
    const [rangeError, setRangeError] = useState<string | null>(null);

    /** Parser robusto de timestamp */
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

    /** Filtrado por rango de fechas */
    const filterByDateRange = (measures: Measure[]) => {
      if (!Array.isArray(measures)) return [];
      const start = new Date(dateRange.start).getTime();
      const end = new Date(dateRange.end).getTime();

      const hasAnyTimestamp = measures.some((m) => !isNaN(parseTimestamp(m)));
      if (!hasAnyTimestamp) return measures;

      return measures.filter((m) => {
        const ts = parseTimestamp(m);
        return !isNaN(ts) && ts >= start && ts <= end;
      });
    };

    /** Genera los datos del reporte */
    useEffect(() => {
      if (!historyData || Object.keys(historyData).length === 0) {
        setReportData([]);
        return;
      }

      const aggregated: ReportRow[] = Object.entries(historyData).map(
        ([zoneKey, measures]) => {
          const filtered = filterByDateRange(measures);
          const base = filtered.length > 0 ? filtered : [];
          const first = Array.isArray(measures) && measures.length > 0 ? measures[0] : null;

          const friendlyName =
            (first as any)?.deviceName ||
            (first as any)?.name ||
            (first as any)?.roomName ||
            (first as any)?.zone ||
            zoneKey;

          if (base.length === 0) {
            return {
              Zona: friendlyName,
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

          const temps = base.map((m: any) => Number(m.temperature)).filter((t) => !isNaN(t));
          const hums = base
            .map((m: any) => Number(m.humedity ?? m.humidity ?? m.hum))
            .filter((h) => !isNaN(h));

          const avgTemp =
            temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2) : "—";
          const avgHum =
            hums.length > 0 ? (hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(2) : "—";

          const minTemp = temps.length ? Math.min(...temps).toFixed(2) : "—";
          const maxTemp = temps.length ? Math.max(...temps).toFixed(2) : "—";
          const minHum = hums.length ? Math.min(...hums).toFixed(2) : "—";
          const maxHum = hums.length ? Math.max(...hums).toFixed(2) : "—";

          const last = base[base.length - 1];
          const lastTs = parseTimestamp(last);
          const lastFormatted = !isNaN(lastTs)
            ? new Date(lastTs).toLocaleString("es-DO", {
                dateStyle: "short",
                timeStyle: "short",
              })
            : "—";

          return {
            Zona: friendlyName,
            "Promedio Temperatura (°C)": avgTemp,
            "Promedio Humedad (%)": avgHum,
            "Temp Mín (°C)": minTemp,
            "Temp Máx (°C)": maxTemp,
            "Hum. Mín (%)": minHum,
            "Hum. Máx (%)": maxHum,
            "Último Registro": lastFormatted,
            "Total Registros": base.length,
          };
        }
      );

      setReportData(aggregated);
    }, [dateRange, historyData]);

    /** 🧩 Manejo de cambios de fecha con validaciones */
    const handleDateChange = (type: "start" | "end", value: string) => {
      if (!value) return;
      let newRange = { ...dateRange, [type]: value };
      const { start, end } = normalizeRange(newRange.start, newRange.end);

      // Detectar error si hay inversión de rango
      if (new Date(end) < new Date(start)) {
        setRangeError("La fecha final no puede ser menor que la inicial.");
      } else if (new Date(end) > new Date()) {
        setRangeError("La fecha final no puede ser futura.");
      } else {
        setRangeError(null);
      }

      setDateRange({ start, end });
    };

    /** Mensaje dinámico del periodo */
    const rangeLabel = useMemo(() => {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      return diffDays === 0
        ? "1 día"
        : `${diffDays + 1} días de datos`;
    }, [dateRange]);

    return (
      <PageContainer
        title="Reporte de Promedios por Zona"
        description="Analiza los datos históricos de temperatura y humedad por zona. Exporta información detallada o promedios personalizados según tus necesidades."
      >
        {/* Controles de rango */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-8 hover:shadow-md transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <CalendarIcon className="w-5 h-5 text-gray-500" />
              Periodo de análisis:
            </label>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateChange("start", e.target.value)}
                max={today}
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none flex-1"
              />
              <ArrowRightIcon className="w-5 h-5 text-gray-400 hidden sm:block" />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateChange("end", e.target.value)}
                min={dateRange.start}
                max={today}
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none flex-1"
              />
            </div>
          </div>

          {/* Exportación */}
          <div className="flex justify-end w-full sm:w-auto">
            <ExportButton
              data={reportData}
              startDate={dateRange.start}
              endDate={dateRange.end}
            />
          </div>
        </div>

        {/* Mensaje de error de rango */}
        {rangeError && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg mb-4 text-sm">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
            {rangeError}
          </div>
        )}

        {/* Resumen de periodo */}
        <div className="text-sm text-gray-500 mb-3">
          <strong>Rango seleccionado:</strong> {rangeLabel}
        </div>

        {/* Tabla */}
        <ReportTable data={reportData} />
      </PageContainer>
    );
  };

  export default ReportPage;
