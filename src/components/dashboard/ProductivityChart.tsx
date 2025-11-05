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
}

const BASE_COLORS = [
  "#3B82F6","#16A34A","#F59E0B","#EF4444","#8B5CF6",
  "#0EA5E9","#E11D48","#14B8A6","#F97316","#6366F1",
];

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
  s.length > max ? s.slice(0, max - 1) + "…" : s;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0].value ?? 0);
  const tone =
    value >= 90 ? "text-green-600" : value >= 70 ? "text-yellow-600" : "text-red-600";
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg px-3 py-2 rounded-md text-sm text-gray-700">
      <p className="font-semibold text-gray-900 mb-1 truncate" title={label}>{label}</p>
      <p>Productividad: <span className={`font-bold ${tone}`}>{value.toFixed(1)}%</span></p>
    </div>
  );
};

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
}) => {
  const isNarrow = useIsNarrow();
  const [localSort, setLocalSort] = useState<"none" | "asc" | "desc">(sortBy);
  useEffect(() => setLocalSort(sortBy), [sortBy]);

  const handleCycleSort = useCallback(() => {
    setLocalSort((s) => (s === "none" ? "desc" : s === "desc" ? "asc" : "none"));
  }, []);

  const { data, originalByName, colorMap } = useMemo(() => {
    const base =
      (rooms ?? []).map((r, i) => {
        const name = r.deviceName || r.name || `Zona ${i + 1}`;
        const baseColor = BASE_COLORS[i % BASE_COLORS.length];
        const p = Number(r.productivity ?? 0);
        return { name, productividad: isNaN(p) ? 0 : p, baseColor, room: r };
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

    return { data: sorted, originalByName: byName, colorMap: cmap };
  }, [rooms, localSort]);

  const avgProductivity =
    data.reduce((sum, d) => sum + d.productividad, 0) / (data.length || 1);

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

  const gradients = data.map((d, i) => ({
    id: `grad-${i}`,
    stops: [
      { offset: "0%", color: d.baseColor, opacity: 0.9 },
      { offset: "100%", color: d.baseColor, opacity: 0.6 },
    ],
  }));

  const fillFor = (p: number, idx: number) => (p < thresholds.warn ? "#9CA3AF" : `url(#grad-${idx})`);

  // === Leyenda compacta al pie ===
  const BottomLegend = () => {
    if (legendPlacement === "none") return null;
    const entries = Object.entries(colorMap).slice(0, legendMaxItems);
    const extra = Object.keys(colorMap).length - entries.length;

    const Swatch = ({ color }: { color: string }) => (
      <span className="inline-block w-2.5 h-2.5 rounded-sm border border-gray-300 mr-1" style={{ background: color }} />
    );

    return (
      <div className="mt-2.5">
        {/* Línea de guías minimal arriba del chart */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600 mb-1.5">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#DCFCE7] border border-green-200" />
            <span>≥ {thresholds.good}%</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#FEF9C3] border border-yellow-200" />
            <span>{thresholds.warn}%–{(thresholds.good - 0.01).toFixed(2)}%</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#9CA3AF] border border-gray-300" />
            <span>{"< "}{thresholds.warn}%</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-4 border-t-2 border-dashed border-blue-500" />
            <span>Promedio {avgProductivity.toFixed(1)}%</span>
          </span>
        </div>

        {/* Colores por zona (envolvente y compacto) */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
          {entries.map(([name, color]) => (
            <span key={name} className="inline-flex items-center">
              <Swatch color={color} />
              <span title={name}>{ellipsize(name, 18)}</span>
            </span>
          ))}
          {extra > 0 && (
            <span className="text-gray-500">+{extra} más…</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-4 ${className}`}
      role="region"
      aria-label="Gráfico de productividad por zona"
    >
      {/* Encabezado mínimo: evita saturar la parte superior */}
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
            Zonas: <b>{data.length}</b> · Promedio: <b className="text-blue-600">{avgProductivity.toFixed(1)}%</b>
          </span>
        </div>
      )}

      {/* Chart con margen superior reducido y más espacio inferior */}
      <ResponsiveContainer width="100%" height={isNarrow ? 300 : 360}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 16, left: 8, bottom: isNarrow ? 52 : 40 }}
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
            height={isNarrow ? 52 : 32}
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
            {showLabels && (
              <LabelList
                dataKey="productividad"
                position="top"
                formatter={(label: any) => {
                  const num = typeof label === "number" ? label : Number(label ?? 0);
                  return isNaN(num) ? "0%" : `${num.toFixed(0)}%`;
                }}
                style={{ fontSize: 11, fill: "#374151", fontWeight: 500, fontFamily: "Inter, system-ui, sans-serif" }}
              />
            )}
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={fillFor(entry.productividad, index)} cursor={onBarClick ? "pointer" : "default"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Leyenda compacta al pie (ocupa el “espacio que sobra” abajo) */}
      <BottomLegend />
    </div>
  );
};

export default ProductivityChart;
