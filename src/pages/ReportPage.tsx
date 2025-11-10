/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
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
  __history?: Measure[];
};
type QuickRange = "today" | "7d" | "30d" | "month" | "custom";

/* =========================
   Helpers de fechas
========================= */
const fromYMDLocal = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
};
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
const normalizeRange = (start: string, end: string) => {
  const today = new Date();
  const s = fromYMDLocal(start);
  let e = fromYMDLocal(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    const t = new Date();
    const w = new Date(t.getTime() - 7 * 24 * 3600 * 1000);
    return { start: toYMD(w), end: toYMD(t) };
  }
  if (e < s) e = s;
  if (e > today) e = today;
  return { start: toYMD(s), end: toYMD(e) };
};
const parseTs = (rec: any): number => {
  const ts = rec?.timestamp ?? rec?.created_at ?? rec?.time ?? rec?.date ?? rec?.updatedAt ?? null;
  if (ts == null) return NaN;
  if (typeof ts === "number") return ts < 9_999_999_999 ? ts * 1000 : ts;
  if (typeof ts === "string") {
    const s = ts.includes(" ") ? ts.replace(" ", "T") : ts;
    const ms = Date.parse(s);
    return Number.isNaN(ms) ? NaN : ms;
  }
  const ms = new Date(ts).getTime();
  return Number.isNaN(ms) ? NaN : ms;
};

/* =========================
   Página (súper simple)
========================= */
const ReportPage: React.FC = () => {
  const { historyData, refreshData } = useContext(WeatherContext);

  const today = new Date();
  const todayStr = toYMD(today);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 3600 * 1000);
  const weekAgoStr = toYMD(weekAgo);

  const [dateRange, setDateRange] = useState({ start: weekAgoStr, end: todayStr });
  const [quick, setQuick] = useState<QuickRange>("7d");
  const [q, setQ] = useState("");
  const [hideEmpty, setHideEmpty] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRefreshRef = useRef<Date | null>(null);

  /* Rango rápido */
  const applyQuick = (kind: QuickRange) => {
    const now = new Date();
    let start = toYMD(now);
    let end = toYMD(now);
    if (kind === "7d") start = toYMD(new Date(now.getTime() - 7 * 24 * 3600 * 1000));
    else if (kind === "30d") start = toYMD(new Date(now.getTime() - 30 * 24 * 3600 * 1000));
    else if (kind === "month") start = toYMD(new Date(now.getFullYear(), now.getMonth(), 1));
    setError(null);
    setDateRange(normalizeRange(start, end));
    setQuick(kind);
  };

  /* Cambio de fechas */
  const handleDateChange = (type: "start" | "end", value: string) => {
    if (!value) return;
    const normalized = normalizeRange(
      type === "start" ? value : dateRange.start,
      type === "end" ? value : dateRange.end
    );
    const s = fromYMDLocal(normalized.start);
    const e = fromYMDLocal(normalized.end);
    const now = new Date();
    if (e < s) setError("Fecha final menor que inicial.");
    else if (e > now) setError("Fecha final en el futuro.");
    else setError(null);
    setDateRange(normalized);
    setQuick("custom");
  };

  /* Ventana inclusiva */
  const windowMs = useMemo(() => {
    const s = startOfDayLocal(dateRange.start).getTime();
    const e = endOfDayLocal(dateRange.end).getTime();
    return [s, e] as const;
  }, [dateRange]);

  /* Agregación */
  const reportData: ReportRow[] = useMemo(() => {
    if (!historyData || typeof historyData !== "object") return [];
    const [startMs, endMs] = windowMs;

    const rows: ReportRow[] = Object.entries(historyData).map(([zoneKey, measuresAny]) => {
      const measures = Array.isArray(measuresAny) ? (measuresAny as Measure[]) : [];
      const hasTs = measures.some((m) => !Number.isNaN(parseTs(m)));
      const base = hasTs
        ? measures.filter((m) => {
            const ts = parseTs(m);
            return !Number.isNaN(ts) && ts >= startMs && ts <= endMs;
          })
        : measures;

      const first = measures[0] as any;
      const name = first?.deviceName ?? first?.name ?? first?.roomName ?? first?.zone ?? zoneKey;

      if (!base.length) {
        return {
          Zona: name,
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

      const temps = base.map((m: any) => Number(m.temperature)).filter(Number.isFinite);
      const hums = base
        .map((m: any) => Number(m.humedity ?? m.humidity ?? m.hum))
        .filter(Number.isFinite);

      const sum = (a: number, b: number) => a + b;
      const avg = (arr: number[]) => (arr.length ? (arr.reduce(sum, 0) / arr.length).toFixed(2) : "—");

      const sorted = [...base].sort((a, b) => (parseTs(a) || 0) - (parseTs(b) || 0));
      const last = sorted[sorted.length - 1];
      const lastTs = last ? parseTs(last) : NaN;

      return {
        Zona: name,
        "Promedio Temperatura (°C)": avg(temps),
        "Promedio Humedad (%)": avg(hums),
        "Temp Mín (°C)": temps.length ? Math.min(...temps).toFixed(2) : "—",
        "Temp Máx (°C)": temps.length ? Math.max(...temps).toFixed(2) : "—",
        "Hum. Mín (%)": hums.length ? Math.min(...hums).toFixed(2) : "—",
        "Hum. Máx (%)": hums.length ? Math.max(...hums).toFixed(2) : "—",
        "Último Registro": Number.isNaN(lastTs)
          ? "—"
          : new Date(lastTs).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" }),
        "Total Registros": base.length,
        __history: base,
      };
    });

    const text = q.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      const passText = text ? String(r.Zona).toLowerCase().includes(text) : true;
      const passEmpty = hideEmpty ? (r["Total Registros"] ?? 0) > 0 : true;
      return passText && passEmpty;
    });

    filtered.sort((a, b) => (b["Total Registros"] ?? 0) - (a["Total Registros"] ?? 0));
    return filtered;
  }, [historyData, windowMs, q, hideEmpty]);

  /* Autorefresco si incluye hoy */
  useEffect(() => {
    if (dateRange.end !== todayStr) return;
    const id = setInterval(() => {
      void refreshData?.();
      lastRefreshRef.current = new Date();
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [dateRange.end, todayStr, refreshData]);

  /* =========================
     UI — Mobile-first minimal
  ========================== */
  return (
    <PageContainer title="Reporte" description={`${reportData.length} zonas`}>
      {/* Barra compacta (stack en móvil) */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
        {/* Rango rápido: select en móvil, píldoras en desktop */}
        <div className="flex flex-col gap-2">
          <div className="sm:hidden">
            <select
              value={quick}
              onChange={(e) => {
                const k = e.target.value as QuickRange;
                k === "custom" ? setQuick("custom") : applyQuick(k);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="today">Hoy</option>
              <option value="7d">7 días</option>
              <option value="30d">30 días</option>
              <option value="month">Mes actual</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-1.5">
            {(["today", "7d", "30d", "month", "custom"] as QuickRange[]).map((k) => (
              <button
                key={k}
                onClick={() => (k === "custom" ? setQuick("custom") : applyQuick(k))}
                className={[
                  "px-3 py-1.5 rounded-md text-sm border",
                  quick === k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300",
                ].join(" ")}
              >
                {k === "today" ? "Hoy" : k === "7d" ? "7 días" : k === "30d" ? "30 días" : k === "month" ? "Mes" : "Personalizado"}
              </button>
            ))}

            <div className="ml-auto">
              <ExportButton data={reportData} startDate={dateRange.start} endDate={dateRange.end} />
            </div>
          </div>

          {/* Fechas solo si es personalizado */}
          {quick === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateChange("start", e.target.value)}
                max={toYMD(new Date())}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateChange("end", e.target.value)}
                min={dateRange.start}
                max={toYMD(new Date())}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Búsqueda + ocultar vacías */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar zona…"
              className="w-full sm:flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={hideEmpty}
                onChange={(e) => setHideEmpty(e.target.checked)}
              />
              Ocultar vacías
            </label>
            <div className="sm:hidden">
              <ExportButton data={reportData} startDate={dateRange.start} endDate={dateRange.end} />
            </div>
          </div>

          {error && <div className="text-xs text-amber-700">{error}</div>}
        </div>
      </div>

      {/* Tabla (tu componente) */}
      <ReportTable data={reportData} />
    </PageContainer>
  );
};

export default ReportPage;
