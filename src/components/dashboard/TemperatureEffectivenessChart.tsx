/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Chart as ChartJS, registerables, type Chart as ChartInstance } from "chart.js";
import { Chart } from "react-chartjs-2";
import { WeatherContext } from "../../context/WeatherContext";
import type { Measure } from "../../types/types";

ChartJS.register(...registerables);

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

const TemperatureEffectivenessChart: React.FC<TemperatureEffectivenessChartProps> = ({
  minLimit = -20,
  maxLimit = -5,
  sortBy = "none",
  loading = false,
  onBarClick,
  className = "",
}) => {
  const { sensors, historyData } = useContext(WeatherContext);
  const chartRef = useRef<ChartInstance<"bar"> | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const set = () => setIsNarrow(mq.matches);
    set();
    mq.addEventListener?.("change", set);
    return () => mq.removeEventListener?.("change", set);
  }, []);

  const clamp = (v: number | null | undefined, min = -40, max = 110) => {
    if (v == null || Number.isNaN(v as number)) return null;
    return Math.max(min, Math.min(max, Number(v)));
  };

  // promedio de temperatura por sensor/zona
  const avgData = useMemo(() => {
    if (!sensors?.length || !historyData) return [];
    const items = sensors.map((sensor) => {
      const key = sensor.devEUI ?? sensor.name;
      const history: Measure[] = historyData[key] || [];
      const temps = history
        .map((h) => clamp((h as any)?.temperature ?? (h as any)?.data?.temperature, -100, 200))
        .filter((v): v is number => v !== null && !isNaN(v));
      const avg = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
      return {
        zone: sensor.deviceName || sensor.name || key,
        avgTemp: Number(avg.toFixed(2)),
      };
    });

    if (sortBy === "asc") return [...items].sort((a, b) => a.avgTemp - b.avgTemp);
    if (sortBy === "desc") return [...items].sort((a, b) => b.avgTemp - a.avgTemp);
    return items;
  }, [sensors, historyData, sortBy]);

  const hasData = avgData.length > 0;

  // colores y gradientes por barra (verde dentro del rango, ámbar cerca, rojo fuera)
  const colorFor = (t: number) => {
    if (t < minLimit - 3 || t > maxLimit + 3) return "#EF4444"; // rojo
    if (t < minLimit || t > maxLimit) return "#F59E0B"; // ámbar
    return "#16A34A"; // verde
  };

  const labels = avgData.map((d) => d.zone);
  const values = avgData.map((d) => d.avgTemp);

  // dataset principal + líneas de límites
  const data = {
    labels,
    datasets: [
      {
        type: "bar" as const,
        label: "Promedio de Temperatura (°C)",
        data: values,
        backgroundColor: (ctx: any) => {
          const v = ctx?.raw as number;
          const base = colorFor(v);
          // gradient sutil
          const chart = ctx?.chart;
          const { ctx: c } = chart;
          const g = c.createLinearGradient(0, 0, 0, chart.chartArea?.bottom ?? 300);
          g.addColorStop(0, base);
          g.addColorStop(1, base + "CC"); // un poco más claro
          return g;
        },
        borderColor: "#1F2937",
        borderWidth: 0.6,
        barThickness: 38,
        borderRadius: 8,
        hoverBackgroundColor: "#3B82F6",
      },
      {
        type: "line" as const,
        label: "Límite mínimo",
        data: Array(labels.length).fill(minLimit),
        borderColor: "rgba(107,114,128,0.7)",
        borderDash: [6, 4],
        borderWidth: 1.2,
        pointRadius: 0,
      },
      {
        type: "line" as const,
        label: "Límite máximo",
        data: Array(labels.length).fill(maxLimit),
        borderColor: "rgba(107,114,128,0.7)",
        borderDash: [6, 4],
        borderWidth: 1.2,
        pointRadius: 0,
      },
    ],
  };

  // plugin para pintar banda entre minLimit y maxLimit
  const RangeBandPlugin = {
    id: "range-band",
    beforeDraw: (chart: any) => {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales?.y) return;
      const yMin = scales.y.getPixelForValue(maxLimit);
      const yMax = scales.y.getPixelForValue(minLimit);
      ctx.save();
      ctx.fillStyle = "rgba(34,197,94,0.08)"; // verde suave
      ctx.fillRect(chartArea.left, Math.min(yMin, yMax), chartArea.right - chartArea.left, Math.abs(yMax - yMin));
      ctx.restore();
    },
  } as const;

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          color: "#374151",
          font: { size: 12, family: "Inter, system-ui, sans-serif" },
        },
      },
      title: {
        display: true,
        text: "Efectividad de Temperatura — Promedio por Zona",
        font: { size: 15, weight: "600", family: "Inter, system-ui, sans-serif" },
        color: "#111827",
        padding: { bottom: 12 },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: "#111827",
        titleColor: "#fff",
        bodyColor: "#e5e7eb",
        borderColor: "#4B5563",
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: false,
        callbacks: {
          title: (ctx: any) => ctx[0].label,
          label: (ctx: any) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(1)} °C`,
          afterBody: (ctx: any) => {
            const v = Number(ctx?.[0]?.parsed?.y ?? 0);
            if (v < minLimit - 3 || v > maxLimit + 3) return "Estado: Fuera de rango";
            if (v < minLimit || v > maxLimit) return "Estado: Cerca del límite";
            return "Estado: En rango";
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Zona", color: "#6B7280" },
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: {
          color: "#6B7280",
          font: { size: 11, family: "Inter, system-ui, sans-serif" },
          maxRotation: isNarrow ? 45 : 0,
          minRotation: 0,
          // ⬇️ FIX: usar el índice para mapear al arreglo labels
          callback: (_value: any, idx: number) => {
            const label = labels[idx] ?? String(_value);
            const maxLen = isNarrow ? 12 : 18;
            return label.length > maxLen ? label.slice(0, maxLen - 1) + "…" : label;
          },
        },
      },
      y: {
        min: Math.min(-40, minLimit - 10),
        max: Math.max(80, maxLimit + 10),
        title: { display: true, text: "°C", color: "#6B7280" },
        ticks: {
          stepSize: 10,
          color: "#6B7280",
          font: { size: 11, family: "Inter, system-ui, sans-serif" },
        },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
    },
    animation: { duration: 700, easing: "easeOutCubic" },
    onClick: (_evt: any, elements: any[]) => {
      if (!elements?.length || !onBarClick) return;
      const el = elements[0];
      const idx = el.index;
      onBarClick({ zone: labels[idx], avgTemp: values[idx] });
    },
  };

  // exportar a PNG
  const handleExport = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const url = chart.toBase64Image("image/png", 1);
    const a = document.createElement("a");
    a.href = url;
    a.download = `temp-effectiveness-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.png`;
    a.click();
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 h-[420px] ${className}`}>
      {/* Header con acciones */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
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
                style={{ pointerEvents: "none" }}
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
      <div className="relative h-[calc(100%-40px)]">
        {loading ? (
          <div className="h-full w-full animate-pulse">
            <div className="h-5 w-1/3 bg-gray-100 rounded mb-3" />
            <div className="h-[85%] bg-gray-50 rounded" />
          </div>
        ) : hasData ? (
          <Chart
            ref={chartRef as any}
            type="bar"
            data={data}
            plugins={[RangeBandPlugin]}
            options={options}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Sin datos disponibles
          </div>
        )}
      </div>
    </div>
  );
};

export default TemperatureEffectivenessChart;
