/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-empty */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  FunnelIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
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
  __zoneCode?: string;
  __history?: Measure[];
};

type QuickRange = "today" | "7d" | "30d" | "month" | "custom";

/* =========================
   Helpers de fechas (local)
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
  const startDate = fromYMDLocal(start);
  let endDate = fromYMDLocal(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    const t = new Date();
    const weekAgo = new Date(t.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start: toYMD(weekAgo), end: toYMD(t) };
  }
  if (endDate < startDate) endDate = startDate;
  if (endDate > today) endDate = today;
  return { start: toYMD(startDate), end: toYMD(endDate) };
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
   Página
========================= */
const ReportPage: React.FC = () => {
  // Usa el nuevo fetchHistoryRange({ from, to }) y el indicador isRangeLoading
  const { historyData, sensors, refreshData, fetchHistoryRange, isRangeLoading } =
    useContext(WeatherContext);

  // Mapa devEUI|name -> nombre visible
  const nameByKey = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of sensors ?? []) {
      const key = s.devEUI ?? s.name;
      if (key) map[key] = s.name;
    }
    return map;
  }, [sensors]);

  // Defaults
  const today = new Date();
  const todayStr = toYMD(today);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = toYMD(weekAgo);

  const [dateRange, setDateRange] = useState({ start: weekAgoStr, end: todayStr });
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [quick, setQuick] = useState<QuickRange>("7d");
  const [q, setQ] = useState("");
  const [hideEmpty, setHideEmpty] = useState(true);

  const lastRefreshRef = useRef<Date | null>(null);

  /* ------- Disparar fetch del histórico por rango ------- */
  useEffect(() => {
    const fromISO = startOfDayLocal(dateRange.start).toISOString();
    const toISO = endOfDayLocal(dateRange.end).toISOString();
    (async () => {
      try {
        await fetchHistoryRange({ from: fromISO, to: toISO });
      } catch {
        // noop
      }
    })();
  }, [dateRange.start, dateRange.end, fetchHistoryRange]);

  /* ------- Al terminar el fetch de rango, podemos hacer logs/validaciones si hace falta ------- */
  const lastLoggedKey = useRef<string>("");
  useEffect(() => {
    if (isRangeLoading) return; // solo cuando termina
    const key = `${dateRange.start}__${dateRange.end}`;
    if (lastLoggedKey.current === key) return;
    lastLoggedKey.current = key;
    // Si quieres validar “puntos por sensor en rango” deja este bloque como referencia:
    // const startMs = startOfDayLocal(dateRange.start).getTime();
    // const endMs = endOfDayLocal(dateRange.end).getTime();
    // const countsInRange: Record<string, number> = {};
    // for (const [sensorKey, arr] of Object.entries(historyData ?? {})) {
    //   const list = Array.isArray(arr) ? arr : [];
    //   let c = 0;
    //   for (const rec of list) {
    //     const t = parseTs(rec);
    //     if (!Number.isNaN(t) && t >= startMs && t <= endMs) c++;
    //   }
    //   countsInRange[sensorKey] = c;
    // }
  }, [isRangeLoading, dateRange.start, dateRange.end, historyData, sensors.length]);

  /* ------- Control de fechas ------- */
  const handleDateChange = (type: "start" | "end", value: string) => {
    if (!value) return;
    const normalized = normalizeRange(
      type === "start" ? value : dateRange.start,
      type === "end" ? value : dateRange.end
    );
    const s = fromYMDLocal(normalized.start);
    const e = fromYMDLocal(normalized.end);
    const now = new Date();
    if (e < s) setRangeError("La fecha final no puede ser menor que la inicial.");
    else if (e > now) setRangeError("La fecha final no puede ser futura.");
    else setRangeError(null);
    setDateRange(normalized);
    setQuick("custom");
  };

  const applyQuick = (kind: QuickRange) => {
    const now = new Date();
    let start = toYMD(now);
    let end = toYMD(now);
    if (kind === "today") {
      start = toYMD(now);
      end = toYMD(now);
    } else if (kind === "7d") {
      start = toYMD(new Date(now.getTime() - 7 * 24 * 3600 * 1000));
    } else if (kind === "30d") {
      start = toYMD(new Date(now.getTime() - 30 * 24 * 3600 * 1000));
    } else if (kind === "month") {
      start = toYMD(new Date(now.getFullYear(), now.getMonth(), 1));
    }
    setRangeError(null);
    setDateRange(normalizeRange(start, end));
    setQuick(kind);
  };

  const windowMs = useMemo(() => {
    const s = startOfDayLocal(dateRange.start).getTime();
    const e = endOfDayLocal(dateRange.end).getTime();
    return [s, e] as const;
  }, [dateRange]);

  /* ------- Agregación ------- */
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

      const resolvedName =
        nameByKey[zoneKey] ??
        ((measures[0] as any)?.roomName ??
          (measures[0] as any)?.zone ??
          (measures[0] as any)?.name ??
          String(zoneKey));

      const code = String(zoneKey);

      if (!base.length) {
        return {
          Zona: resolvedName,
          __zoneCode: code,
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
        .map((m: any) => Number(m.humedity ?? (m as any).humidity ?? (m as any).hum))
        .filter(Number.isFinite);

      const sum = (a: number, b: number) => a + b;
      const avg = (arr: number[]) => (arr.length ? (arr.reduce(sum, 0) / arr.length).toFixed(2) : "—");

      const sorted = [...base].sort((a, b) => (parseTs(a) || 0) - (parseTs(b) || 0));
      const last = sorted[sorted.length - 1];
      const lastTs = last ? parseTs(last) : NaN;

      return {
        Zona: resolvedName,
        __zoneCode: code,
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
  }, [historyData, windowMs, q, hideEmpty, nameByKey]);

  /* ------- Etiqueta de rango ------- */
  const rangeLabel = useMemo(() => {
    const s = startOfDayLocal(dateRange.start).getTime();
    const e = endOfDayLocal(dateRange.end).getTime();
    const diffDays = Math.floor((e - s) / (1000 * 3600 * 24)) + 1;
    return diffDays <= 1 ? "1 día" : `${diffDays} días de datos`;
  }, [dateRange]);

  /* ------- Autorefresco cada 10 min si incluye hoy ------- */
  useEffect(() => {
    const includesToday = dateRange.end === todayStr;
    if (!includesToday) return;
    const id = setInterval(async () => {
      try {
        await Promise.all([
          refreshData?.(),
          fetchHistoryRange({
            from: startOfDayLocal(dateRange.start).toISOString(),
            to: endOfDayLocal(dateRange.end).toISOString(),
          }),
        ]);
        lastRefreshRef.current = new Date();
      } catch {}
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [dateRange.end, dateRange.start, todayStr, refreshData, fetchHistoryRange]);

  const lastRefreshHuman = useMemo(() => {
    const d = lastRefreshRef.current;
    return d ? d.toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" }) : "—";
  }, [lastRefreshRef.current]);

  /* ------- UI ------- */
  const isCustom = quick === "custom";

  return (
    <PageContainer
      title="Reporte de Promedios por Zona"
      description="Analiza datos históricos de temperatura y humedad por zona. Exporta promedios y extremos en el rango elegido."
    >
      {/* CONTROLES */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4 items-end bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex flex-col gap-3">
          {/* Quick ranges + bandeja inline en lg+ */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <CalendarIcon className="w-5 h-5 text-gray-500" />
              Periodo:
            </span>

            {/* Botones */}
            <div className="flex flex-wrap gap-1.5">
              {([
                { k: "today", label: "Hoy" },
                { k: "7d", label: "7 días" },
                { k: "30d", label: "30 días" },
                { k: "month", label: "Mes actual" },
                { k: "custom", label: "Personalizado" },
              ] as { k: QuickRange; label: string }[]).map((b) => (
                <button
                  key={b.k}
                  onClick={() => (b.k === "custom" ? setQuick("custom") : applyQuick(b.k))}
                  className={[
                    "px-2.5 py-1.5 rounded-md border text-xs transition",
                    quick === b.k
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Chip de loading del rango */}
            <div
              className={[
                "ml-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs",
                isRangeLoading
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-gray-50 text-gray-500",
              ].join(" ")}
              title={isRangeLoading ? "Cargando histórico del rango…" : "Rango listo"}
            >
              <ArrowPathIcon
                className={["w-4 h-4", isRangeLoading ? "animate-spin" : ""].join(" ")}
              />
              {isRangeLoading ? "Cargando rango…" : "Rango listo"}
            </div>

            {/* Bandeja inline (SOLO lg+) */}
            <div
              className={[
                "hidden lg:flex items-center gap-2 ml-2",
                "transition-all duration-200",
                isCustom ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none",
              ].join(" ")}
            >
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateChange("start", e.target.value)}
                max={toYMD(new Date())}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-40"
              />
              <ArrowRightIcon className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateChange("end", e.target.value)}
                min={dateRange.start}
                max={toYMD(new Date())}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-40"
              />
              <button
                onClick={() => applyQuick("7d")}
                className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => setQuick("custom")}
                className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Aplicar
              </button>
            </div>
          </div>

          {/* Bloque de fechas móvil */}
          <div
            aria-hidden={!isCustom}
            className={[
              "lg:hidden rounded-lg border border-dashed border-gray-200 bg-gray-50/70",
              "px-3 py-3 sm:px-4 sm:py-3",
              "transition-all duration-200",
              isCustom ? "opacity-100 scale-100 visible" : "opacity-0 scale-[.98] invisible",
              "min-h-[92px] sm:min-h-[80px]",
            ].join(" ")}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleDateChange("start", e.target.value)}
                  max={toYMD(new Date())}
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-full sm:w-44"
                />
                <ArrowRightIcon className="w-5 h-5 text-gray-400 hidden sm:block" />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleDateChange("end", e.target.value)}
                  min={dateRange.start}
                  max={toYMD(new Date())}
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-full sm:w-44"
                />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => applyQuick("7d")}
                  className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setQuick("custom")}
                  className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>

          {/* Búsqueda y switches */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative sm:ml-0 flex-1">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar zona…"
                className="w-full pl-8 pr-3 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={hideEmpty}
                onChange={(e) => setHideEmpty(e.target.checked)}
              />
              <FunnelIcon className="w-4 h-4" />
              Ocultar zonas sin data
            </label>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <ExportButton
            data={reportData}
            startDate={dateRange.start}
            endDate={dateRange.end}
            disabled={isRangeLoading}
          />
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <ArrowPathIcon className={["w-4 h-4", isRangeLoading ? "animate-spin" : ""].join(" ")} />
            Últ. actualización: {lastRefreshHuman}
          </div>
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
      <div className="flex flex-wrap items-center justify-between mb-3">
        <div className="text-sm text-gray-600">
          <strong>Rango seleccionado:</strong> {rangeLabel}
        </div>
        <div className="text-sm text-gray-500">
          <strong>Filas:</strong> {reportData.length}
        </div>
      </div>

      {/* TABLA o EMPTY STATE */}
      {reportData.length > 0 ? (
        <ReportTable
          loading={isRangeLoading}
          data={reportData}
          customRenderers={{
            Zona: (value: string, row: ReportRow) => (
              <div className="leading-tight">
                <div className="font-medium text-gray-900">{value}</div>
                {row.__zoneCode && (
                  <div className="text-[11px] text-gray-500">{row.__zoneCode}</div>
                )}
              </div>
            ),
          } as any}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center bg-white border border-gray-100 rounded-2xl p-8 sm:p-12 shadow-sm">
          <div className="rounded-full border border-gray-200 p-4 mb-3">
            <InboxIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">
            No hay datos para el rango seleccionado
          </h3>
          <p className="mt-1 text-sm text-gray-500 max-w-md">
            Ajusta el periodo o quita filtros para ver resultados. También puedes volver al rango rápido de
            <span className="font-medium"> 7 días</span>.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => {
                setQ("");
                setHideEmpty(false);
                applyQuick("7d");
              }}
              className="px-3 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
            >
              Restablecer filtros
            </button>
            <button
              onClick={() => setQuick("custom")}
              className="px-3 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-50"
            >
              Elegir fechas
            </button>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default ReportPage;
