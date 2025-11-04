/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
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
} from "recharts";
import { WeatherContext } from "../../context/WeatherContext";
import type { Measure } from "../../types/types";

type SortBy = "none" | "asc" | "desc";

interface TemperatureEffectivenessChartProps {
  /** Rango ideal; por defecto [-20, -5] */
  minLimit?: number;
  maxLimit?: number;
  /** Ordenar por temperatura promedio */
  sortBy?: SortBy;
  /** Mostrar skeleton de carga */
  loading?: boolean;
  /** Click en barra (retorna zona y valor promedio) */
  onBarClick?: (payload: { zone: string; avgTemp: number }) => void;
  /** Clase extra del contenedor */
  className?: string;
}

const useIsNarrow = (query = "(max-width: 640px)") => {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [query]);
  return narrow;
};

// Clamp tolerante
const clamp = (v: number | null | undefined, min = -40, max = 110) => {
  if (v == null || Number.isNaN(v as number)) return null;
  return Math.max(min, Math.min(max, Number(v)));
};

// Truncado para etiquetas en ejes
const ellipsize = (s: string, max = 16) => (s.length > max ? s.slice(0, max - 1) + "…" : s);

// Color por estado vs rango
const colorFor = (t: number, minLimit: number, maxLimit: number) => {
  if (t < minLimit - 3 || t > maxLimit + 3) return "#EF4444"; // rojo
  if (t < minLimit || t > maxLimit) return "#F59E0B"; // ámbar
  return "#16A34A"; // verde
};

const TemperatureEffectivenessChartRecharts: React.FC<TemperatureEffectivenessChartProps> = ({
  minLimit = -20,
  maxLimit = -5,
  sortBy = "none",
  loading = false,
  onBarClick,
  className = "",
}) => {
  const { sensors, historyData } = useContext(WeatherContext);
  const isNarrow = useIsNarrow();

  // Calcular promedio por zona
  const avgData = useMemo(() => {
    if (!sensors?.length || !historyData) return [] as { zone: string; avgTemp: number }[];
    const items = sensors.map((sensor) => {
      const key = (sensor as any).devEUI ?? sensor.name;
      const history: Measure[] = historyData[key] || [];
      const temps = history
        .map((h) => clamp((h as any)?.temperature ?? (h as any)?.data?.temperature, -100, 200))
        .filter((v): v is number => v !== null && !isNaN(v));
      const avg = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
      return {
        zone: (sensor as any).deviceName || sensor.name || key,
        avgTemp: Number(avg.toFixed(2)),
      };
    });

    if (sortBy === "asc") return [...items].sort((a, b) => a.avgTemp - b.avgTemp);
    if (sortBy === "desc") return [...items].sort((a, b) => b.avgTemp - a.avgTemp);
    return items;
  }, [sensors, historyData, sortBy]);

  const hasData = avgData.length > 0;

  // Exportar PNG: serializa el <svg> dentro del contenedor y lo pinta en canvas
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleExport = async () => {
    const container = containerRef.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    // hace que el load de SVG respete estilos embebidos
    img.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej();
      img.src = url;
    });

    const bbox = svg.getBoundingClientRect();
    const w = Math.max(800, Math.round(bbox.width));
    const h = Math.max(400, Math.round(bbox.height));

    const canvas = document.createElement("canvas");
    canvas.width = w * 2; // @2x para nitidez
    canvas.height = h * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((png) => {
      if (!png) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(png);
      link.download = `temp-effectiveness-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  // Gradiente por barra (usando defs por índice)
  const gradients = avgData.map((d, i) => {
    const base = colorFor(d.avgTemp, minLimit, maxLimit);
    return {
      id: `grad-te-${i}`,
      stops: [
        { offset: "0%", color: base, opacity: 0.95 },
        { offset: "100%", color: base, opacity: 0.7 },
      ],
    };
  });

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 ${className}`}
      ref={containerRef}
    >
      {/* Header con acciones */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="text-sm text-gray-600">
          Rango ideal: <span className="font-semibold text-gray-800">{minLimit}°C</span> a{" "}
          <span className="font-semibold text-gray-800">{maxLimit}°C</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500 hidden sm:inline">Orden:</span>
          <div className="flex items-center gap-1">
            {(["none", "asc", "desc"] as SortBy[]).map((s) => (
              <span
                key={s}
                className={`px-2 py-1 rounded-md text-xs border ${
                  sortBy === s
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                }`}
                title="El orden se controla por prop 'sortBy'"
              >
                {s === "none" ? "Natural" : s === "asc" ? "Asc" : "Desc"}
              </span>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="px-2.5 py-1.5 rounded-md text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
          >
            Exportar PNG
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="relative w-full h-[340px] sm:h-[380px] md:h-[420px]">
        {loading ? (
          <div className="h-full w-full animate-pulse">
            <div className="h-5 w-1/3 bg-gray-100 rounded mb-3" />
            <div className="h-[85%] bg-gray-50 rounded" />
          </div>
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={avgData}
              margin={{ top: 12, right: 16, left: 8, bottom: isNarrow ? 40 : 20 }}
            >
              {/* Defs de gradiente por barra */}
              <defs>
                {gradients.map((g) => (
                  <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                    {g.stops.map((s, i) => (
                      <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
                    ))}
                  </linearGradient>
                ))}
              </defs>

              {/* Bandas de rango ideal */}
              <ReferenceArea y1={minLimit} y2={maxLimit} fill="#22C55E" fillOpacity={0.10} />

              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis
                dataKey="zone"
                interval={0}
                height={isNarrow ? 40 : 24}
                tick={{
                  fontSize: 12,
                  fill: "#6b7280",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
                angle={isNarrow ? -22 : 0}
                textAnchor={isNarrow ? "end" : "middle"}
                tickFormatter={(v: string) => ellipsize(v, isNarrow ? 14 : 20)}
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
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const v = Number(payload[0].value ?? 0);
                  const tone =
                    v < minLimit - 3 || v > maxLimit + 3
                      ? "text-red-600"
                      : v < minLimit || v > maxLimit
                      ? "text-yellow-600"
                      : "text-green-600";
                  return (
                    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg px-3 py-2 rounded-lg text-sm text-gray-700">
                      <p className="font-semibold text-gray-900 mb-1 truncate">
                        {label}
                      </p>
                      <p>
                        Promedio:{" "}
                        <span className={`font-bold ${tone}`}>{v.toFixed(1)}°C</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: 8 }}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-gray-700 text-sm">{value}</span>
                )}
              />

              {/* Barras principales */}
              <Bar
                dataKey="avgTemp"
                name="Promedio de Temperatura"
                radius={[8, 8, 0, 0]}
                maxBarSize={72}
                onClick={(d: any) => {
                  if (!onBarClick) return;
                  onBarClick({ zone: d?.zone, avgTemp: d?.avgTemp });
                }}
                isAnimationActive
                animationDuration={700}
              >
                {/* Etiquetas encima */}
                <LabelList
                  dataKey="avgTemp"
                  position="top"
                  formatter={(v: any) => `${Number(v ?? 0).toFixed(1)}°`}
                  style={{
                    fontSize: 11,
                    fill: "#374151",
                    fontWeight: 500,
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                />
                {/* Celdas con gradiente según estado */}
                {avgData.map((_d, i) => {
                  return (
                    <Cell
                      key={`cell-${i}`}
                      fill={`url(#grad-te-${i})`}
                      stroke="#1F2937"
                      strokeWidth={0.4}
                      cursor={onBarClick ? "pointer" : "default"}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Sin datos disponibles
          </div>
        )}
      </div>
    </div>
  );
};

export default TemperatureEffectivenessChartRecharts;
