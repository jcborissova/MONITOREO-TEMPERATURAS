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
  Legend,
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
   Hooks / helpers UI
========================= */
const useIsNarrow = (query = "(max-width: 640px)") => {
  const [narrow, setNarrow] = useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [query]);
  return narrow;
};

const clamp = (v: number | null | undefined, min = -40, max = 110) => {
  if (v == null || Number.isNaN(v as number)) return null;
  return Math.max(min, Math.min(max, Number(v)));
};

const ellipsize = (s: string, max = 16) => (s?.length > max ? s.slice(0, max - 1) + "…" : s);

const colorFor = (t: number, minLimit: number, maxLimit: number) => {
  if (t < minLimit - 3 || t > maxLimit + 3) return "#EF4444"; // rojo
  if (t < minLimit || t > maxLimit) return "#F59E0B"; // ámbar
  return "#16A34A"; // verde
};

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
   Resolución de histórico unificada
========================= */
type HistoryDict = Record<string, any[]>;

const buildLooseIndex = (historyData: HistoryDict) => {
  const index = new Map<string, string>();
  for (const k of Object.keys(historyData || {})) {
    index.set(String(k).toLowerCase(), k);
  }
  return index;
};

const pickHistory = (sensor: any, historyData: HistoryDict, looseIndex: Map<string, string>) => {
  const cands = [sensor?.devEUI, sensor?.name, sensor?.deviceName]
    .map((x) => (x == null ? "" : String(x)))
    .filter(Boolean);
  for (const k of cands) if (historyData[k]) return historyData[k];
  for (const k of cands) {
    const real = looseIndex.get(k.toLowerCase());
    if (real && historyData[real]) return historyData[real];
  }
  return [];
};

/* =========================
   Componente principal
========================= */
const TemperatureEffectivenessChartRecharts: React.FC<TemperatureEffectivenessChartProps> = ({
  minLimit = -20,
  maxLimit = -5,
  sortBy = "none",
  loading = false,
  onBarClick,
  className = "",
  hideOffline = false,
  excludeOfflineFromGlobalAvg = true,
}) => {
  const { sensors, historyData } = useContext(WeatherContext);
  const { getSmartConnection } = useContext(SensorsContext);
  const isNarrow = useIsNarrow();

  const looseIndex = useMemo(() => buildLooseIndex(historyData || {}), [historyData]);

  const enriched = useMemo(() => {
    if (!sensors?.length || !historyData) {
      return [] as Array<{ zone: string; avgTemp: number; lastSeen: Date | null; isConnected: boolean }>;
    }

    const rows = sensors.map((sensor, i) => {
      const keyLabel = (sensor as any).deviceName || (sensor as any).name || (sensor as any).devEUI || `Zona ${i + 1}`;
      const list: Measure[] = pickHistory(sensor, historyData, looseIndex) as any[];

      const temps = list
        .map((m: any) => clamp(m?.temperature ?? m?.data?.temperature ?? (m as any)?.temp, -100, 200))
        .filter((v): v is number => v !== null && !isNaN(v));
      const avg = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : NaN;

      // conexión usando la misma lógica del contexto
      const conn = getSmartConnection(sensor, list);
      // fecha de último dato (para tooltip)
      const lastRaw =
        list.length
          ? (list[list.length - 1] as any).timestamp ??
            (list[list.length - 1] as any).created_at ??
            (list[list.length - 1] as any).updatedAt ??
            (list[list.length - 1] as any).date
          : (sensor as any).updatedAt ?? (sensor as any).lastSeen ?? (sensor as any).timestamp ?? (sensor as any).date;

      return {
        zone: keyLabel,
        avgTemp: Number.isFinite(avg) ? Number(avg.toFixed(2)) : NaN,
        lastSeen: toSafeDate(lastRaw),
        isConnected: !!conn.isConnected,
      };
    });

    const ordered =
      sortBy === "asc"
        ? [...rows].sort((a, b) => a.avgTemp - b.avgTemp)
        : sortBy === "desc"
        ? [...rows].sort((a, b) => b.avgTemp - a.avgTemp)
        : rows;

    return hideOffline ? ordered.filter((r) => r.isConnected) : ordered;
  }, [sensors, historyData, sortBy, hideOffline, getSmartConnection, looseIndex]);

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
    const base = excludeOfflineFromGlobalAvg ? enriched.filter((r) => r.isConnected) : enriched;
    const temps = base.map((r) => r.avgTemp).filter((n) => Number.isFinite(n));
    const avg = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : NaN;
    return Number.isFinite(avg) ? avg : NaN;
  }, [enriched, excludeOfflineFromGlobalAvg]);

  const gradients = enriched.map((d, i) => {
    const base = Number.isFinite(d.avgTemp) ? colorFor(d.avgTemp, minLimit, maxLimit) : "#9CA3AF";
    return {
      id: `grad-te-${i}`,
      stops: [
        { offset: "0%", color: base, opacity: 0.95 },
        { offset: "100%", color: base, opacity: 0.7 },
      ],
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload ?? {};
    const v = Number(payload[0]?.value ?? NaN);
    const tone =
      v < minLimit - 3 || v > maxLimit + 3
        ? "text-red-600"
        : v < minLimit || v > maxLimit
        ? "text-yellow-600"
        : "text-green-600";

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg px-3 py-2 rounded-lg text-sm text-gray-700 max-w-[320px]">
        <p className="font-semibold text-gray-900 mb-1 truncate" title={label}>
          {label}
        </p>
        <p>
          Promedio:{" "}
          <span className={`font-bold ${tone}`}>
            {Number.isFinite(v) ? v.toFixed(1) : "—"}°C
          </span>
        </p>
        <p>
          Estado:{" "}
          {row.isConnected ? (
            <span className="text-green-600 font-medium">Conectado</span>
          ) : (
            <span className="text-red-600 font-medium">Desconectado</span>
          )}
        </p>
        <p>
          Última actualización:{" "}
          <span className="font-medium">{fmtAbs(row.lastSeen)}</span>
          {row.lastSeen && <span className="text-gray-500"> ({fmtRel(row.lastSeen)})</span>}
        </p>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="text-sm text-gray-600">
          Rango ideal: <span className="font-semibold text-gray-800">{minLimit}°C</span> a{" "}
          <span className="font-semibold text-gray-800">{maxLimit}°C</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {Number.isFinite(globalAvg) && (
            <span className="text-xs sm:text-sm text-gray-600 inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-dashed border-blue-500" />
              Promedio global: <b className="text-blue-600">{globalAvg.toFixed(1)}°C</b>
              {excludeOfflineFromGlobalAvg ? <i className="text-gray-400 ml-1">(sin OFF)</i> : null}
            </span>
          )}
          {globalLast && (
            <span className="text-xs sm:text-sm text-gray-500 inline-flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Últ. act.: <b className="ml-1">{fmtAbs(globalLast)}</b>
              <span className="ml-1">({fmtRel(globalLast)})</span>
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full h-[340px] sm:h-[380px] md:h-[420px]">
        {loading ? (
          <div className="h-full w-full animate-pulse">
            <div className="h-5 w-1/3 bg-gray-100 rounded mb-3" />
            <div className="h-[85%] bg-gray-50 rounded" />
          </div>
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={enriched}
              margin={{ top: 10, right: 16, left: 8, bottom: isNarrow ? 52 : 32 }}
              barGap={8}
            >
              <defs>
                {gradients.map((g) => (
                  <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                    {g.stops.map((s, i) => (
                      <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
                    ))}
                  </linearGradient>
                ))}
                <pattern id="diag-offline" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="#E5E7EB" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#9CA3AF" strokeWidth="2" />
                </pattern>
              </defs>

              <ReferenceArea y1={minLimit} y2={maxLimit} fill="#22C55E" fillOpacity={0.12} />

              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis
                dataKey="zone"
                interval={0}
                height={isNarrow ? 52 : 32}
                tick={{ fontSize: 12, fill: "#6b7280", fontFamily: "Inter, system-ui, sans-serif" }}
                angle={isNarrow ? -22 : 0}
                textAnchor={isNarrow ? "end" : "middle"}
                tickFormatter={(v: string) => ellipsize(v, isNarrow ? 14 : 20)}
              />
              <YAxis
                domain={[Math.min(-40, minLimit - 10), Math.max(80, maxLimit + 10)]}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickFormatter={(v) => `${v}°C`}
                axisLine={false}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />

              {Number.isFinite(globalAvg) && (
                <ReferenceLine
                  y={globalAvg}
                  stroke="#3B82F6"
                  strokeDasharray="4 3"
                  label={{
                    value: `Promedio ${globalAvg.toFixed(1)}°C`,
                    position: "right",
                    fill: "#3B82F6",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
              )}

              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: 8 }}
                iconType="circle"
                formatter={(value) => <span className="text-gray-700 text-sm">{value}</span>}
              />

              <Bar
                dataKey="avgTemp"
                name="Promedio de Temperatura"
                radius={[8, 8, 0, 0]}
                maxBarSize={72}
                onClick={(d: any) => onBarClick?.({ zone: d?.zone, avgTemp: d?.avgTemp })}
                isAnimationActive
                animationDuration={700}
              >
                <LabelList
                  dataKey="avgTemp"
                  position="top"
                  formatter={
                    ((value: any, entry: any) => {
                      const num = Number(value ?? NaN);
                      const base = Number.isFinite(num) ? `${num.toFixed(1)}°` : "—";
                      return entry?.isConnected ? base : `${base} · OFF`;
                    }) as unknown as (label: React.ReactNode) => React.ReactNode
                  }
                />
                {enriched.map((row, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={row.isConnected ? `url(#grad-te-${i})` : "url(#diag-offline)"}
                    stroke={row.isConnected ? "transparent" : "#9CA3AF"}
                    strokeWidth={row.isConnected ? 0 : 1}
                    cursor={onBarClick ? "pointer" : "default"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">Sin datos disponibles</div>
        )}
      </div>
    </div>
  );
};

export default TemperatureEffectivenessChartRecharts;
