/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useState, useContext } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  ReferenceArea,
  LabelList,
  ReferenceLine,
} from "recharts";
import { WeatherContext } from "../../context/WeatherContext";
import { SensorsContext } from "../../context/SensorsContext";
import type { Measure } from "../../types/types";

/* =========================
   Tipos / Props
========================= */
type SortBy = "none" | "asc" | "desc";

interface TemperatureEffectivenessChartProps {
  minLimit?: number;
  maxLimit?: number;
  sortBy?: SortBy;
  loading?: boolean;
  onBarClick?: (payload: { zone: string; avgTemp: number }) => void;
  className?: string;
  hideOffline?: boolean;
  excludeOfflineFromGlobalAvg?: boolean;
}

/* =========================
   Helpers UI
========================= */

const useIsNarrow = (query = "(max-width: 640px)") => {
  const [narrow, setNarrow] = useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const handleChange = () => setNarrow(mq.matches);

    handleChange();
    mq.addEventListener?.("change", handleChange);
    return () => mq.removeEventListener?.("change", handleChange);
  }, [query]);

  return narrow;
};

const clamp = (v: number | null | undefined, min = -40, max = 110) => {
  if (v == null || Number.isNaN(v as number)) return null;
  return Math.max(min, Math.min(max, Number(v)));
};

const ellipsize = (s: string, max = 16) =>
  s && s.length > max ? s.slice(0, max - 1) + "…" : s;

const toSafeDate = (v: any): Date | null => {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  if (typeof v === "number") {
    const ms = v < 9_999_999_999 ? v * 1000 : v;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof v === "string") {
    const s = v.includes(" ") ? v.replace(" ", "T") : v;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v as any);
  return isNaN(d.getTime()) ? null : d;
};

const fmtAbs = (d: Date | null) =>
  d
    ? d.toLocaleString("es-DO", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "desconocido";

const fmtRel = (d: Date | null) => {
  if (!d) return "";
  const min = (Date.now() - d.getTime()) / 60000;
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${Math.floor(min)} min`;
  const h = min / 60;
  if (h < 24) return `${Math.floor(h)} h`;
  const days = Math.floor(h / 24);
  return `${days} d`;
};

/* =========================
   Colores determinísticos por sensor
========================= */
const PALETTE = [
  "#2563EB",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#A855F7",
  "#06B6D4",
  "#84CC16",
  "#D946EF",
  "#0EA5E9",
  "#F97316",
  "#22C55E",
  "#E11D48",
  "#14B8A6",
  "#8B5CF6",
  "#F43F5E",
  "#3B82F6",
];

const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
};

const colorByKey = (key: string, idxFallback = 0) =>
  PALETTE[hashStr(key) % PALETTE.length] ||
  PALETTE[idxFallback % PALETTE.length];

/* =========================
   Resolución de histórico
========================= */
type HistoryDict = Record<string, any[]>;

const buildLooseIndex = (historyData: HistoryDict) => {
  const index = new Map<string, string>();
  for (const k of Object.keys(historyData || {})) {
    index.set(String(k).toLowerCase(), k);
  }
  return index;
};

const pickHistory = (
  sensor: any,
  historyData: HistoryDict,
  looseIndex: Map<string, string>
) => {
  const cands = [sensor?.devEUI, sensor?.name, sensor?.deviceName]
    .map((x) => (x == null ? "" : String(x)))
    .filter(Boolean);

  // Match exact
  for (const k of cands) if (historyData[k]) return historyData[k];

  // Match case-insensitive / aproximado
  for (const k of cands) {
    const real = looseIndex.get(k.toLowerCase());
    if (real && historyData[real]) return historyData[real];
  }

  return [];
};

/* =========================
   Lógica de “efectividad”
========================= */

type ComfortBand = "below" | "within" | "above" | "nodata";

const classifyTemp = (
  value: number | null | undefined,
  minLimit: number,
  maxLimit: number
): ComfortBand => {
  const n = typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n)) return "nodata";
  if (n < minLimit) return "below";
  if (n > maxLimit) return "above";
  return "within";
};

const bandLabel = (band: ComfortBand) => {
  switch (band) {
    case "below":
      return "Por debajo del rango";
    case "above":
      return "Por encima del rango";
    case "within":
      return "Dentro del rango";
    default:
      return "Sin datos";
  }
};

const bandToneClass = (band: ComfortBand) => {
  switch (band) {
    case "within":
      return "text-emerald-600";
    case "below":
    case "above":
      return "text-amber-600";
    case "nodata":
    default:
      return "text-gray-500";
  }
};

/* =========================
   Componente principal
========================= */

type ZoneRow = {
  key: string;
  zone: string;
  avgTemp: number; // puede ser NaN
  lastSeen: Date | null;
  isConnected: boolean;
  color: string;
  hasData: boolean;
};

const TemperatureEffectivenessChartRecharts: React.FC<
  TemperatureEffectivenessChartProps
> = ({
  minLimit = -20,
  maxLimit = -5,
  sortBy = "none",
  loading = false,
  onBarClick,
  className = "",
  hideOffline = false,
  excludeOfflineFromGlobalAvg = true,
}) => {
  const { sensors, historyData } = useContext(WeatherContext) as any;
  const { getSmartConnection } = useContext(SensorsContext) as any;
  const isNarrow = useIsNarrow();

  // Altura más fluida según viewport (mejor en PWA / mobile / tablet)
  const chartHeight = isNarrow ? 380 : 420;

  const looseIndex = useMemo(
    () => buildLooseIndex((historyData || {}) as HistoryDict),
    [historyData]
  );

  const enriched: ZoneRow[] = useMemo(() => {
    if (!sensors?.length || !historyData) return [];

    const rows: ZoneRow[] = sensors.map((sensor: any, i: number) => {
      const key =
        sensor?.devEUI || sensor?.deviceName || sensor?.name || `Zona ${i + 1}`;

      const label = sensor?.deviceName || sensor?.name || key;

      const list: Measure[] = pickHistory(
        sensor,
        historyData as any,
        looseIndex
      ) as any[];

      const temps = list
        .map((m: any) =>
          clamp(
            m?.temperature ?? m?.data?.temperature ?? (m as any)?.temp,
            -100,
            200
          )
        )
        .filter((v): v is number => v !== null && !isNaN(v));

      const avg = temps.length
        ? temps.reduce((a, b) => a + b, 0) / temps.length
        : NaN;

      const conn = getSmartConnection?.(sensor, list) ?? { isConnected: false };

      const lastRaw =
        list.length > 0
          ? (list[list.length - 1] as any).timestamp ??
            (list[list.length - 1] as any).created_at ??
            (list[list.length - 1] as any).updatedAt ??
            (list[list.length - 1] as any).date
          : sensor?.updatedAt ??
            sensor?.lastSeen ??
            sensor?.timestamp ??
            sensor?.date;

      return {
        key,
        zone: label,
        avgTemp: Number.isFinite(avg) ? Number(avg.toFixed(2)) : NaN,
        lastSeen: toSafeDate(lastRaw),
        isConnected: !!conn.isConnected,
        color: colorByKey(String(key), i),
        hasData: temps.length > 0,
      };
    });

    const ordered =
      sortBy === "asc"
        ? [...rows].sort((a, b) => a.avgTemp - b.avgTemp)
        : sortBy === "desc"
        ? [...rows].sort((a, b) => b.avgTemp - a.avgTemp)
        : rows;

    return hideOffline ? ordered.filter((r) => r.isConnected) : ordered;
  }, [sensors, historyData, looseIndex, sortBy, hideOffline, getSmartConnection]);

  const hasData = enriched.length > 0;

  const globalLast = useMemo(() => {
    if (!enriched.length) return null as Date | null;
    return enriched.reduce<Date | null>((acc, r) => {
      if (!r.lastSeen) return acc;
      if (!acc) return r.lastSeen;
      return r.lastSeen.getTime() > acc.getTime() ? r.lastSeen : acc;
    }, null);
  }, [enriched]);

  const globalAvg = useMemo(() => {
    const base = excludeOfflineFromGlobalAvg
      ? enriched.filter((r) => r.isConnected && r.hasData)
      : enriched.filter((r) => r.hasData);

    const temps = base
      .map((r) => r.avgTemp)
      .filter((n) => Number.isFinite(n));

    const avg = temps.length
      ? temps.reduce((a, b) => a + b, 0) / temps.length
      : NaN;

    return Number.isFinite(avg) ? avg : NaN;
  }, [enriched, excludeOfflineFromGlobalAvg]);

  const totalWithin = useMemo(
    () =>
      enriched.filter((r) =>
        Number.isFinite(r.avgTemp)
          ? classifyTemp(r.avgTemp, minLimit, maxLimit) === "within"
          : false
      ).length,
    [enriched, minLimit, maxLimit]
  );

  const totalWithData = enriched.filter((r) => r.hasData).length;

  // Ancho mínimo del chart para permitir scroll horizontal en mobile
  const minChartWidth = useMemo(() => {
    if (!enriched.length) return 480;
    const baseBarWidth = isNarrow ? 72 : 56;
    return Math.max(enriched.length * baseBarWidth, 480);
  }, [enriched.length, isNarrow]);

  /* ========= Tooltip ========== */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const row: ZoneRow = payload[0]?.payload ?? ({} as any);
    const v = Number(payload[0]?.value ?? NaN);
    const band = classifyTemp(v, minLimit, maxLimit);

    const toneClass =
      band === "within"
        ? "text-emerald-600"
        : band === "nodata"
        ? "text-gray-500"
        : "text-amber-600";

    const isOffline = !row?.isConnected;

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg px-3 py-2 rounded-lg text-xs sm:text-sm text-gray-700 max-w-[320px]">
        <p className="font-semibold text-gray-900 mb-1 truncate" title={label}>
          {label}
        </p>

        <p className="flex items-center gap-1">
          Promedio:{" "}
          <span className={`font-bold ${toneClass}`}>
            {Number.isFinite(v) ? v.toFixed(1) : "—"}°C
          </span>
        </p>

        <p className="mt-0.5">
          Estado:{" "}
          {isOffline ? (
            <span className="text-red-600 font-medium">Desconectado</span>
          ) : (
            <span className="text-green-600 font-medium">Conectado</span>
          )}
        </p>

        <p className="mt-0.5">
          Rango ideal:{" "}
          <span className="font-medium">
            {minLimit}°C – {maxLimit}°C
          </span>
        </p>

        <p className="mt-0.5">
          Clasificación:{" "}
          <span className={`font-medium ${bandToneClass(band)}`}>
            {bandLabel(band)}
          </span>
        </p>

        <p className="mt-0.5">
          Última actualización:{" "}
          <span className="font-medium">{fmtAbs(row.lastSeen)}</span>
          {row.lastSeen && (
            <span className="text-gray-500"> ({fmtRel(row.lastSeen)})</span>
          )}
        </p>
      </div>
    );
  };

  /* ========= Leyenda personalizada (global) ========== */
  const CustomLegend = () => {
    if (!enriched.length) return null;

    const online = enriched.filter((r) => r.isConnected).length;
    const offline = enriched.length - online;

    return (
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs md:text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 bg-white">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Online <b className="text-gray-900">{online}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 bg-white">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" />
            Offline <b className="text-gray-900">{offline}</b>
          </span>
          {Number.isFinite(globalAvg) && (
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 bg-white">
              <span className="inline-block w-3 border-t-2 border-dashed border-blue-500" />
              Promedio global:{" "}
              <b className="text-blue-600">{globalAvg.toFixed(1)}°C</b>
              {excludeOfflineFromGlobalAvg && (
                <i className="text-gray-400 ml-1">(sin OFF)</i>
              )}
            </span>
          )}
          {totalWithData > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 bg-white">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-200" />
              Dentro de rango:{" "}
              <b className="text-emerald-700">
                {totalWithin}/{totalWithData}
              </b>
            </span>
          )}
        </div>

        {/* Chips con scroll horizontal en mobile */}
        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 pr-1">
          {enriched.map((r, i) => {
            const band = classifyTemp(r.avgTemp, minLimit, maxLimit);
            return (
              <span
                key={`legend-chip-${r.key}-${i}`}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] sm:text-xs bg-white"
                title={r.zone}
              >
                <span
                  className="inline-block w-3 h-3 rounded"
                  style={{
                    background: r.isConnected ? r.color : "#9CA3AF",
                    maskImage: r.isConnected
                      ? "none"
                      : "repeating-linear-gradient(45deg,#000 0 2px,transparent 2px 4px)",
                    WebkitMaskImage: r.isConnected
                      ? "none"
                      : "repeating-linear-gradient(45deg,#000 0 2px,transparent 2px 4px)",
                  }}
                />
                <span className="text-gray-700">
                  {ellipsize(r.zone, isNarrow ? 16 : 22)}
                </span>
                {r.hasData ? (
                  <span
                    className={`font-medium ${
                      band === "within"
                        ? "text-emerald-600"
                        : band === "nodata"
                        ? "text-gray-500"
                        : "text-amber-600"
                    }`}
                  >
                    {Number.isFinite(r.avgTemp) ? `${r.avgTemp.toFixed(1)}°` : "—"}
                  </span>
                ) : (
                  <span className="font-medium text-gray-400">Sin datos</span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  /* ========= Gradientes por barra (para volumen) ========== */
  const gradients = enriched.map((d, i) => ({
    id: `grad-te-${i}`,
    color: d.color,
  }));

  const showSkeleton = loading;
  const showEmpty = !loading && !hasData;

  return (
    <div
      className={`
        bg-white rounded-2xl border border-gray-200 shadow-sm 
        p-3 sm:p-4 md:p-5 
        flex flex-col
        ${className}
      `}
    >
      {/* Header */}
      <div className="mb-2 sm:mb-3 flex flex-col sm:flex-row sm:flex-wrap gap-1.5 sm:gap-2">
        <div className="text-xs sm:text-sm text-gray-600">
          Rango ideal:{" "}
          <span className="font-semibold text-gray-800">{minLimit}°C</span> a{" "}
          <span className="font-semibold text-gray-800">{maxLimit}°C</span>
        </div>

        {globalLast && (
          <div className="sm:ml-auto text-[11px] sm:text-xs md:text-sm text-gray-500 inline-flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Últ. act.: <b className="ml-1">{fmtAbs(globalLast)}</b>
            <span className="ml-1">({fmtRel(globalLast)})</span>
          </div>
        )}
      </div>

      {/* Leyenda global fuera del gráfico (para que no se pegue) */}
      <CustomLegend />

      {/* Contenedor del gráfico: scroll horizontal + altura responsiva */}
      <div
        className="
          relative w-full mt-3
          overflow-x-auto overflow-y-hidden
        "
        style={{
          // Altura responsive en función del viewport: funciona bien en web y PWA
          maxHeight: "70vh",
        }}
      >
        <div
          className="relative"
          style={{
            height: chartHeight,
            minWidth: minChartWidth,
          }}
        >
          {showSkeleton ? (
            <div className="h-full w-full animate-pulse">
              <div className="h-5 w-1/3 bg-gray-100 rounded mb-3" />
              <div className="h-[85%] bg-gray-50 rounded" />
            </div>
          ) : showEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs sm:text-sm px-3">
              <p className="font-medium">Sin datos disponibles</p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-1 text-center">
                Verifica el histórico de sensores o ajusta los filtros.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={enriched}
                margin={{
                  top: 20,
                  right: 16,
                  left: 8,
                  bottom: isNarrow ? 88 : 40,
                }}
                barGap={10}
              >
                <defs>
                  {gradients.map((g) => (
                    <linearGradient
                      key={g.id}
                      id={g.id}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={g.color} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={g.color} stopOpacity={0.7} />
                    </linearGradient>
                  ))}
                  <pattern
                    id="diag-offline"
                    patternUnits="userSpaceOnUse"
                    width="6"
                    height="6"
                    patternTransform="rotate(45)"
                  >
                    <rect width="6" height="6" fill="#E5E7EB" />
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="6"
                      stroke="#9CA3AF"
                      strokeWidth="2"
                    />
                  </pattern>
                </defs>

                {/* Zona verde de operación ideal */}
                <ReferenceArea
                  y1={minLimit}
                  y2={maxLimit}
                  fill="#22C55E"
                  fillOpacity={0.12}
                />

                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis
                  dataKey="zone"
                  interval={0}
                  height={isNarrow ? 72 : 40}
                  tick={{
                    fontSize: 11,
                    fill: "#6b7280",
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                  angle={isNarrow ? -26 : 0}
                  textAnchor={isNarrow ? "end" : "middle"}
                  tickFormatter={(v: string) =>
                    ellipsize(v, isNarrow ? 16 : 22)
                  }
                />
                <YAxis
                  domain={[
                    Math.min(-40, minLimit - 10),
                    Math.max(80, maxLimit + 10),
                  ]}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(v) => `${v}°C`}
                  axisLine={false}
                />

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                />

                {Number.isFinite(globalAvg) && (
                  <ReferenceLine
                    y={globalAvg}
                    stroke="#3B82F6"
                    strokeDasharray="4 3"
                    label={{
                      value: `Promedio ${globalAvg.toFixed(1)}°C`,
                      position: "right",
                      fill: "#3B82F6",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                )}

                <Bar
                  dataKey="avgTemp"
                  name="Promedio de Temperatura"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={72}
                  onClick={(d: any) =>
                    onBarClick?.({ zone: d?.zone, avgTemp: d?.avgTemp })
                  }
                  isAnimationActive
                  animationDuration={700}
                >
                  <LabelList
                    dataKey="avgTemp"
                    position="top"
                    formatter={(value: any) => {
                      const num = Number(value ?? NaN);
                      return Number.isFinite(num) ? `${num.toFixed(1)}°` : "—";
                    }}
                    style={{
                      fontSize: 10,
                      fill: "#374151",
                    }}
                  />

                  {enriched.map((row, i) => (
                    <Cell
                      key={`cell-${row.key}-${i}`}
                      fill={
                        row.isConnected ? `url(#grad-te-${i})` : "url(#diag-offline)"
                      }
                      stroke={row.isConnected ? row.color : "#9CA3AF"}
                      strokeWidth={row.isConnected ? 0 : 1}
                      cursor={onBarClick ? "pointer" : "default"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemperatureEffectivenessChartRecharts;
