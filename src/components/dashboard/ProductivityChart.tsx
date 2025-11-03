/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
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
  sortBy?: "none" | "asc" | "desc"; // orden por productividad
  onBarClick?: (room: Room) => void;
  thresholds?: {
    warn: number;   // p.ej. 70
    good: number;   // p.ej. 90
  };
  className?: string;
}

// 🎨 Paleta elegante (gradientes usarán base)
const BASE_COLORS = [
  "#3B82F6", // azul
  "#16A34A", // verde
  "#F59E0B", // amarillo
  "#EF4444", // rojo
  "#8B5CF6", // violeta
  "#0EA5E9", // celeste
  "#E11D48", // rosado
  "#14B8A6", // turquesa
  "#F97316", // naranja
  "#6366F1", // índigo
];

// Hook: detectar viewport estrecho (SSR-safe)
const useIsNarrow = (query = "(max-width: 600px)") => {
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

// Truncado elegante con elipsis
const ellipsize = (s: string, max = 14) =>
  s.length > max ? s.slice(0, max - 1) + "…" : s;

// Tooltip moderno
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0].value ?? 0);
  const tone =
    value >= 90 ? "text-green-600" : value >= 70 ? "text-yellow-600" : "text-red-600";
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg px-3 py-2 rounded-lg text-sm text-gray-700">
      <p className="font-semibold text-gray-900 mb-1 truncate" title={label}>
        {label}
      </p>
      <p>
        Productividad: <span className={`font-bold ${tone}`}>{value.toFixed(1)}%</span>
      </p>
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
}) => {
  const isNarrow = useIsNarrow();

  // Datos preparados
  const { data, originalByName } = useMemo(() => {
    const base =
      (rooms ?? []).map((r, i) => {
        const baseColor = BASE_COLORS[i % BASE_COLORS.length];
        const p = Number(r.productivity ?? 0);
        return {
          name: r.deviceName || r.name || `Zona ${i + 1}`,
          productividad: isNaN(p) ? 0 : p,
          baseColor,
          room: r,
        };
      }) ?? [];

    // ordenar si aplica
    const sorted =
      sortBy === "asc"
        ? [...base].sort((a, b) => a.productividad - b.productividad)
        : sortBy === "desc"
        ? [...base].sort((a, b) => b.productividad - a.productividad)
        : base;

    // mapa auxiliar para click
    const byName = new Map(sorted.map((d) => [d.name, d.room]));
    return { data: sorted, originalByName: byName };
  }, [rooms, sortBy]);

  const avgProductivity =
    data.reduce((sum, d) => sum + d.productividad, 0) / (data.length || 1);

  // Skeleton
  if (loading) {
    return (
      <div
        className={`w-full h-[260px] sm:h-[320px] md:h-[380px] lg:h-[420px] bg-white border border-gray-200 rounded-2xl shadow-sm p-4 ${className}`}
      >
        <div className="h-full w-full animate-pulse">
          <div className="h-5 w-1/3 bg-gray-100 rounded mb-3" />
          <div className="h-[85%] bg-gray-50 rounded" />
        </div>
      </div>
    );
  }

  // Vacío
  if (!data.length) {
    return (
      <div
        className={`flex items-center justify-center h-[260px] text-gray-400 text-sm bg-white border border-gray-200 rounded-2xl shadow-sm ${className}`}
      >
        Sin datos disponibles
      </div>
    );
  }

  // Gradientes para barras
  const gradients = data.map((d, i) => ({
    id: `grad-${i}`,
    stops: [
      { offset: "0%", color: d.baseColor, opacity: 0.9 },
      { offset: "100%", color: d.baseColor, opacity: 0.6 },
    ],
  }));

  // Colores finales (suaves si < good, gris si < warn)
  const fillFor = (p: number, idx: number) => {
    if (p < thresholds.warn) return "#9CA3AF"; // gris neutro
    return `url(#grad-${idx})`;
  };

  return (
    <div
      className={`w-full h-[260px] sm:h-[320px] md:h-[380px] lg:h-[420px] bg-white border border-gray-200 rounded-2xl shadow-sm p-4 ${className}`}
      role="region"
      aria-label="Gráfico de productividad por zona"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 16, left: 8, bottom: isNarrow ? 48 : 32 }}
          barGap={8}
        >
          {/* Definición de gradientes */}
          <defs>
            {gradients.map((g) => (
              <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                {g.stops.map((s, i) => (
                  <stop
                    key={i}
                    offset={s.offset}
                    stopColor={s.color}
                    stopOpacity={s.opacity}
                  />
                ))}
              </linearGradient>
            ))}
          </defs>

          {/* Bandas de umbral */}
          <ReferenceArea y1={thresholds.warn} y2={thresholds.good} fill="#FEF9C3" fillOpacity={0.45} />
          <ReferenceArea y1={thresholds.good} y2={100} fill="#DCFCE7" fillOpacity={0.4} />

          {/* Grid + Ejes */}
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            interval={0}
            height={isNarrow ? 50 : 32}
            tick={{
              fontSize: 12,
              fill: "#6b7280",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
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

          {/* Promedio */}
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

          {/* Barras */}
          <Bar
            dataKey="productividad"
            radius={[10, 10, 0, 0]}
            maxBarSize={72}
            isAnimationActive
            animationDuration={800}
            onClick={(d: any) => {
              const room = originalByName.get(d?.name);
              if (room && onBarClick) onBarClick(room);
            }}
          >
            <LabelList
              dataKey="productividad"
              position="top"
              formatter={(label: any) => {
                const num = typeof label === "number" ? label : Number(label ?? 0);
                return isNaN(num) ? "0%" : `${num.toFixed(0)}%`;
              }}
              style={{
                fontSize: 11,
                fill: "#374151",
                fontWeight: 500,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            />
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={fillFor(entry.productividad, index)}
                cursor={onBarClick ? "pointer" : "default"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProductivityChart;
