/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useContext, useMemo, useState } from "react";
import { CalendarIcon, ArrowRightIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { WeatherContext } from "../context/WeatherContext";
import PageContainer from "../components/layout/PageContainer";
import ExportButton from "../components/report/ExportButton";
import ReportTable from "../components/report/ReportTable";
import type { Measure } from "../types/types";

/* =========================
   Tipos
========================= */
export type ReportRow = {
  Zona: string;
  "Promedio Temperatura (°C)": string | number;
  "Promedio Humedad (%)": string | number;
  "Temp Mín (°C)": string | number;
  "Temp Máx (°C)": string | number;
  "Hum. Mín (%)": string | number;
  "Hum. Máx (%)": string | number;
  "Último Registro": string;
  "Total Registros": number;
  /** Histórico filtrado para el expandible */
  __history?: Measure[];
};

/* =========================
   Helpers de fechas (local)
========================= */

/** Convierte 'YYYY-MM-DD' a Date local (00:00) */
const fromYMDLocal = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
};

/** Devuelve 'YYYY-MM-DD' en local sin pasar por toISOString() */
const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOfDayLocal = (ymd: string) => fromYMDLocal(ymd);

const endOfDayLocal = (ymd: string) => {
  const dt = fromYMDLocal(ymd);
  dt.setHours(23, 59, 59, 999);
  return dt;
};

/** Asegura fechas válidas e inclusivas en local */
const normalizeRange = (start: string, end: string) => {
  const today = new Date();
  const startDate = fromYMDLocal(start);
  let endDate = fromYMDLocal(end);

  // inválidos => última semana
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    const t = new Date();
    const weekAgo = new Date(t.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start: toYMD(weekAgo), end: toYMD(t) };
  }

  // evita invertidos
  if (endDate < startDate) endDate = startDate;

  // evita futuro
  if (endDate > today) endDate = today;

  return { start: toYMD(startDate), end: toYMD(endDate) };
};

/** Parser de timestamp robusto -> ms */
const parseTs = (rec: any): number => {
  const ts = rec?.timestamp ?? rec?.created_at ?? rec?.time ?? rec?.date ?? rec?.updatedAt;
  if (ts == null) return NaN;

  if (typeof ts === "number") {
    // soporta epoch en segundos y ms
    return ts < 9_999_999_999 ? ts * 1000 : ts;
  }

  if (typeof ts === "string") {
    // Soporta "YYYY-MM-DD HH:mm:ss" -> cambiar espacio por 'T'
    const s = ts.includes(" ") ? ts.replace(" ", "T") : ts;
    const ms = Date.parse(s);
    return Number.isNaN(ms) ? NaN : ms;
  }

  const ms = new Date(ts).getTime();
  return Number.isNaN(ms) ? NaN : ms;
};

/* =========================
   Página
========================= */
const ReportPage: React.FC = () => {
  const { historyData } = useContext(WeatherContext);

  // Defaults en YMD (local)
  const today = new Date();
  const todayStr = toYMD(today);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = toYMD(weekAgo);

  const [dateRange, setDateRange] = useState({ start: weekAgoStr, end: todayStr });
  const [rangeError, setRangeError] = useState<string | null>(null);

  /** Cambio de rango con validación (local) */
  const handleDateChange = (type: "start" | "end", value: string) => {
    if (!value) return;
    const candidate = { ...dateRange, [type]: value };
    const normalized = normalizeRange(candidate.start, candidate.end);

    // Validaciones de UX
    const s = fromYMDLocal(normalized.start);
    const e = fromYMDLocal(normalized.end);
    const now = new Date();

    if (e < s) setRangeError("La fecha final no puede ser menor que la inicial.");
    else if (e > now) setRangeError("La fecha final no puede ser futura.");
    else setRangeError(null);

    setDateRange(normalized);
  };

  /** Ventana inclusiva en ms (local) */
  const windowMs = useMemo(() => {
    const s = startOfDayLocal(dateRange.start).getTime();
    const e = endOfDayLocal(dateRange.end).getTime();
    return [s, e] as const;
  }, [dateRange]);

  /** Agregación (memoizada, sin efectos) */
  const reportData: ReportRow[] = useMemo(() => {
    if (!historyData || typeof historyData !== "object") return [];

    const rows: ReportRow[] = Object.entries(historyData).map(([zoneKey, measuresAny]) => {
      const measures = Array.isArray(measuresAny) ? (measuresAny as Measure[]) : [];

      // filtrar por rango si hay timestamps
      const [startMs, endMs] = windowMs;
      const hasTs = measures.some((m) => !Number.isNaN(parseTs(m)));
      const base = hasTs
        ? measures.filter((m) => {
            const ts = parseTs(m);
            return !Number.isNaN(ts) && ts >= startMs && ts <= endMs;
          })
        : measures;

      // nombre amigable
      const first = measures.length ? (measures[0] as any) : undefined;
      const friendlyName =
        first?.deviceName ?? first?.name ?? first?.roomName ?? first?.zone ?? zoneKey;

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
          __history: [],
        };
      }

      const temps = base
        .map((m: any) => Number(m.temperature))
        .filter((v) => Number.isFinite(v));
      const hums = base
        .map((m: any) => Number(m.humedity ?? m.humidity ?? m.hum))
        .filter((v) => Number.isFinite(v));

      const sum = (a: number, b: number) => a + b;
      const avg = (arr: number[]) =>
        arr.length ? (arr.reduce(sum, 0) / arr.length).toFixed(2) : "—";

      const avgTemp = avg(temps);
      const avgHum = avg(hums);

      const minTemp = temps.length ? Math.min(...temps).toFixed(2) : "—";
      const maxTemp = temps.length ? Math.max(...temps).toFixed(2) : "—";
      const minHum = hums.length ? Math.min(...hums).toFixed(2) : "—";
      const maxHum = hums.length ? Math.max(...hums).toFixed(2) : "—";

      // último registro por ts real (sin usar .at)
      const sorted = [...base].sort((a, b) => (parseTs(a) || 0) - (parseTs(b) || 0));
      const last = sorted.length ? sorted[sorted.length - 1] : undefined;
      const lastTs = last != null ? parseTs(last) : NaN;
      const lastFormatted = Number.isNaN(lastTs)
        ? "—"
        : new Date(lastTs).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" });

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
        __history: base, // el expandible usará este histórico ya filtrado
      };
    });

    // orden: más registros primero
    rows.sort((a, b) => (b["Total Registros"] ?? 0) - (a["Total Registros"] ?? 0));
    return rows;
  }, [historyData, windowMs]);

  /** Label del rango (días inclusivos) */
  const rangeLabel = useMemo(() => {
    const s = startOfDayLocal(dateRange.start).getTime();
    const e = endOfDayLocal(dateRange.end).getTime();
    const diffDays = Math.floor((e - s) / (1000 * 3600 * 24)) + 1;
    return diffDays <= 1 ? "1 día" : `${diffDays} días de datos`;
  }, [dateRange]);

  return (
    <PageContainer
      title="Reporte de Promedios por Zona"
      description="Analiza datos históricos de temperatura y humedad por zona. Exporta tus promedios y extremos en el rango elegido."
    >
      {/* Controles */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-8">
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
              max={todayStr}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none flex-1"
            />
            <ArrowRightIcon className="w-5 h-5 text-gray-400 hidden sm:block" />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleDateChange("end", e.target.value)}
              min={dateRange.start}
              max={todayStr}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none flex-1"
            />
          </div>
        </div>

        <div className="flex justify-end w-full sm:w-auto">
          <ExportButton data={reportData} startDate={dateRange.start} endDate={dateRange.end} />
        </div>
      </div>

      {/* Error rango */}
      {rangeError && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg mb-4 text-sm">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
          {rangeError}
        </div>
      )}

      {/* Resumen */}
      <div className="text-sm text-gray-500 mb-3">
        <strong>Rango seleccionado:</strong> {rangeLabel}
      </div>

      {/* Tabla */}
      <ReportTable data={reportData} />
    </PageContainer>
  );
};

export default ReportPage;
