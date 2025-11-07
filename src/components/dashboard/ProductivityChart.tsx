/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  LabelList,
  Cell,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import type { Room } from "../../types/types";

/* =========================
   Tipos / Props
========================= */
interface ProductivityChartProps {
  rooms: Room[];
  loading?: boolean;
  sortBy?: "none" | "asc" | "desc";
  onBarClick?: (room: Room) => void;
  thresholds?: { warn: number; good: number };
  className?: string;
  showControls?: boolean;
  showGuides?: boolean;
  showLabels?: boolean;
  /** 'bottom' | 'none' — leyenda compacta al pie (por defecto), o sin leyenda */
  legendPlacement?: "bottom" | "none";
  /** Límite visual de zonas en leyenda (por si hay muchísimas) */
  legendMaxItems?: number;
  /** Minutos para considerar conectado (default: 5) */
  liveWindowMin?: number;
}

/* =========================
   Config base
========================= */
const BASE_COLORS = [
  "#3B82F6","#16A34A","#F59E0B","#EF4444","#8B5CF6",
  "#0EA5E9","#E11D48","#14B8A6","#F97316","#6366F1",
];

/* =========================
   Helpers de UI / tiempo
========================= */
const useIsNarrow = (query = "(max-width: 640px)") => {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [query]);
  return narrow;
};

const ellipsize = (s: string, max = 16) =>
  s && s.length > max ? s.slice(0, max - 1) + "…" : s;

const coerceDate = (v: any): Date | null => {
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

const formatAbs = (d: Date | null) =>
  d
    ? d.toLocaleString("es-DO", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "desconocido";

const formatRel = (from: Date | null) => {
  if (!from) return "";
  const min = (Date.now() - from.getTime()) / 60000;
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${Math.floor(min)} min`;
  const h = min / 60;
  if (h < 24) return `${Math.floor(h)} h`;
  const d = h / 24;
  return `${Math.floor(d)} d`;
};

/* =========================
   Tooltip enriquecido
========================= */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const d = payload[0]?.payload ?? {};
  const value = Number(payload[0].value ?? 0);
  const tone =
    value >= 90 ? "text-green-600" : value >= 70 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg px-3 py-2 rounded-md text-sm text-gray-700 max-w-[320px]">
      <p className="font-semibold text-gray-900 mb-1 truncate" title={label}>
        {label}
      </p>
      <div className="space-y-0.5">
        <p>
          Productividad:{" "}
          <span className={`font-bold ${tone}`}>{value.toFixed(1)}%</span>
        </p>
        <p>
          Estado:{" "}
          {d.isConnected ? (
            <span className="text-green-600 font-medium">Conectado</span>
          ) : (
            <span className="text-red-600 font-medium">Desconectado</span>
          )}
        </p>
        <p>
          Última actualización:{" "}
          <span className="font-medium">{formatAbs(d.lastSeen)}</span>
          {d.lastSeen && (
            <span className="text-gray-500"> {" ("}{formatRel(d.lastSeen)}{")"}</span>
          )}
        </p>
        {Number.isFinite(d.batteryPct) && (
          <p>
            Batería:{" "}
            <span className={d.isConnected ? "text-gray-800" : "text-gray-500"}>
              {Math.round(d.batteryPct)}%
              {!d.isConnected && " (offline)"}
            </span>
          </p>
        )}
        {Number.isFinite(d.temperature) && d.isConnected && (
          <p>
            Temperatura: <span className="font-medium">{d.temperature.toFixed(1)} °C</span>
          </p>
        )}
        {Number.isFinite(d.humidity) && d.isConnected && (
          <p>
            Humedad: <span className="font-medium">{d.humidity.toFixed(1)} %</span>
          </p>
        )}
      </div>
    </div>
  );
};

/* =========================
   Componente principal
========================= */
const ProductivityChart: React.FC<ProductivityChartProps> = ({
  rooms,
  loading = false,
  sortBy = "none",
  onBarClick,
  thresholds = { warn: 70, good: 90 },
  className = "",
  showControls = true,
  showGuides = true,
  showLabels = true,
  legendPlacement = "bottom",
  legendMaxItems = 12,
  liveWindowMin = 5,
}) => {
  const isNarrow = useIsNarrow();
  const [localSort, setLocalSort] = useState<"none" | "asc" | "desc">(sortBy);
  useEffect(() => setLocalSort(sortBy), [sortBy]);

  const handleCycleSort = useCallback(() => {
    setLocalSort((s) => (s === "none" ? "desc" : s === "desc" ? "asc" : "none"));
  }, []);

  // Enriquecer data con estado, última actualización y métricas auxiliares
  const { data, originalByName, colorMap, globalLast } = useMemo(() => {
    const base =
      (rooms ?? []).map((r, i) => {
        const name = r.deviceName || r.name || `Zona ${i + 1}`;
        const baseColor = BASE_COLORS[i % BASE_COLORS.length];

        // productividad
        const pRaw = Number((r as any).productivity ?? (r as any).lastPower ?? 0);
        const productividad = Number.isFinite(pRaw) ? pRaw : 0;

        // lastSeen
        const updatedAt =
          (r as any).updatedAt ??
          (r as any).lastSeen ??
          (r as any).timestamp ??
          (r as any).date ??
          null;
        const lastSeen = coerceDate(updatedAt);

        // estado
        const isConnected =
          !!lastSeen && (Date.now() - lastSeen.getTime()) / 60000 <= liveWindowMin;

        // batería / métricas opcionales (si vienen en room)
        const batteryPct = Number(
          (r as any).battery ??
          (r as any).lastPower ??
          (r as any).batteryPct ??
          NaN
        );
        const temperature = Number((r as any).temperature ?? NaN);
        const humidity = Number((r as any).humedity ?? (r as any).humidity ?? NaN);

        return {
          name,
          productividad: isNaN(productividad) ? 0 : productividad,
          baseColor,
          room: r,
          // enriquecidos para tooltip y estilos
          isConnected,
          lastSeen,
          batteryPct,
          temperature,
          humidity,
        };
      }) ?? [];

    const sorted =
      localSort === "asc"
        ? [...base].sort((a, b) => a.productividad - b.productividad)
        : localSort === "desc"
        ? [...base].sort((a, b) => b.productividad - a.productividad)
        : base;

    const byName = new Map(sorted.map((d) => [d.name, d.room]));
    const cmap: Record<string, string> = {};
    sorted.forEach((d) => (cmap[d.name] = d.baseColor));

    // última actualización global
    const globalLast =
      sorted.reduce<Date | null>((acc, d) => {
        if (!d.lastSeen) return acc;
        if (!acc) return d.lastSeen;
        return d.lastSeen.getTime() > acc.getTime() ? d.lastSeen : acc;
      }, null) ?? null;

    return { data: sorted, originalByName: byName, colorMap: cmap, globalLast };
  }, [rooms, localSort, liveWindowMin]);

  const avgProductivity =
    data.reduce((sum, d) => sum + d.productividad, 0) / (data.length || 1);

  /* ==== Cargas / estados vacíos ==== */
  if (loading) {
    return (
      <div className={`w-full h-[320px] bg-white border border-gray-200 rounded-2xl shadow-sm p-4 ${className}`}>
        <div className="h-full w-full animate-pulse">
          <div className="h-5 w-1/3 bg-gray-100 rounded mb-3" />
          <div className="h-[85%] bg-gray-50 rounded" />
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={`flex items-center justify-center h-[260px] text-gray-400 text-sm bg-white border border-gray-200 rounded-2xl shadow-sm ${className}`}>
        Sin datos disponibles
      </div>
    );
  }

  /* ==== Gradientes y patrones ==== */
  const gradients = data.map((d, i) => ({
    id: `grad-${i}`,
    stops: [
      { offset: "0%", color: d.baseColor, opacity: 0.9 },
      { offset: "100%", color: d.baseColor, opacity: 0.6 },
    ],
  }));

  const fillFor = (d: any, idx: number) =>
    d.isConnected
      ? `url(#grad-${idx})`
      : "url(#diag-offline)"; // patrón gris para offline

  /* ==== Leyenda compacta ==== */
  const BottomLegend = () => {
    if (legendPlacement === "none") return null;
    const entries = Object.entries(colorMap).slice(0, legendMaxItems);
    const extra = Object.keys(colorMap).length - entries.length;

    const Swatch = ({ color }: { color: string }) => (
      <span
        className="inline-block w-2.5 h-2.5 rounded-sm border border-gray-300 mr-1"
        style={{ background: color }}
      />
    );

    return (
      <div className="mt-2.5">
        {/* Guías y meta-info */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600 mb-1.5">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#DCFCE7] border border-green-200" />
            <span>≥ {thresholds.good}%</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#FEF9C3] border border-yellow-200" />
            <span>
              {thresholds.warn}%–{(thresholds.good - 0.01).toFixed(2)}%
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#9CA3AF] border border-gray-300" />
            <span>{"< "}{thresholds.warn}%</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-4 border-t-2 border-dashed border-blue-500" />
            <span>Promedio {avgProductivity.toFixed(1)}%</span>
          </span>
          {globalLast && (
            <span className="inline-flex items-center gap-1 text-gray-500">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Últ. act.: <b className="ml-1">{formatAbs(globalLast)}</b>
              <span className="ml-1">({formatRel(globalLast)})</span>
            </span>
          )}
        </div>

        {/* Colores por zona */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
          {entries.map(([name, color]) => (
            <span key={name} className="inline-flex items-center">
              <Swatch color={color} />
              <span title={name}>{ellipsize(name, 18)}</span>
            </span>
          ))}
          {extra > 0 && <span className="text-gray-500">+{extra} más…</span>}
        </div>
      </div>
    );
  };

  /* ==== Render ==== */
  return (
    <div
      className={`w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-4 ${className}`}
      role="region"
      aria-label="Gráfico de productividad por zona"
    >
      {/* Encabezado / controles */}
      {showControls && (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <button
            onClick={handleCycleSort}
            className="px-2.5 py-1.5 rounded-md border text-gray-700 hover:bg-gray-100"
            title="Cambiar orden"
          >
            Orden: {localSort === "none" ? "Ninguno" : localSort === "asc" ? "Ascendente" : "Descendente"}
          </button>

          <span className="ml-auto text-gray-500">
            Zonas: <b>{data.length}</b> · Promedio:{" "}
            <b className="text-blue-600">{avgProductivity.toFixed(1)}%</b>
          </span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={isNarrow ? 300 : 360}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 16, left: 8, bottom: isNarrow ? 62 : 46 }}
          barGap={8}
        >
          {/* Gradientes y patrón para offline */}
          <defs>
            {gradients.map((g) => (
              <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                {g.stops.map((s, i) => (
                  <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
                ))}
              </linearGradient>
            ))}

            {/* Patrón gris diagonal para OFFLINE */}
            <pattern id="diag-offline" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#E5E7EB" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#9CA3AF" strokeWidth="2" />
            </pattern>
          </defs>

          {showGuides && (
            <>
              <ReferenceArea y1={thresholds.warn} y2={thresholds.good} fill="#FEF9C3" fillOpacity={0.35} />
              <ReferenceArea y1={thresholds.good} y2={100} fill="#DCFCE7" fillOpacity={0.32} />
            </>
          )}

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="name"
            interval={0}
            height={isNarrow ? 62 : 46}
            tick={{ fontSize: 12, fill: "#6b7280", fontFamily: "Inter, system-ui, sans-serif" }}
            angle={isNarrow ? -25 : 0}
            textAnchor={isNarrow ? "end" : "middle"}
            tickFormatter={(v: string) => ellipsize(v, isNarrow ? 12 : 18)}
          />

          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />

          {showGuides && (
            <ReferenceLine
              y={avgProductivity}
              stroke="#3b82f6"
              strokeDasharray="4 3"
              label={{
                value: `Promedio ${avgProductivity.toFixed(1)}%`,
                position: "right",
                fill: "#3b82f6",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
          )}

          <Bar
            dataKey="productividad"
            name="Productividad"
            radius={[10, 10, 0, 0]}
            maxBarSize={72}
            isAnimationActive
            animationDuration={700}
            onClick={(d: any) => {
              const room = originalByName.get(d?.name);
              if (room && onBarClick) onBarClick(room);
            }}
          >
            {/* Etiquetas: muestran % y si está OFF, agregamos un badge */}
            {showLabels && (
              <LabelList
                dataKey="productividad"
                position="top"
                content={(props: any) => {
                  const { x, y, value, index } = props;
                  const item = data[index];
                  const pct = Number(value ?? 0);
                  const text = item?.isConnected ? `${Math.round(pct)}%` : `${Math.round(pct)}% · OFF`;
                  return (
                    <text x={x} y={y} dy={-4} style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }}>
                      {text}
                    </text>
                  );
                }}
              />
            )}

            {/* Fills por barra: gradiente si online, patrón si offline */}
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={fillFor(entry, index)}
                cursor={onBarClick ? "pointer" : "default"}
                stroke={entry.isConnected ? "transparent" : "#9CA3AF"}
                strokeWidth={entry.isConnected ? 0 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Leyenda / meta-info al pie */}
      <BottomLegend />
    </div>
  );
};

export default ProductivityChart;
