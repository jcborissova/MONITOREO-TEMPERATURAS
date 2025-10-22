/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useContext, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { WeatherContext } from "../../context/WeatherContext";
import type { Measure } from "../../types/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

const SENSOR_COLORS: Record<string, string> = {
  SALA: "#f59e0b",
  COCINA: "#16a34a",
  COCINA2: "#22c55e",
  BANO: "#f97316",
  CUARTO: "#db2777",
  PASILLO: "#0ea5e9",
  DEFAULT: "#64748b",
};

const pickColor = (name: string) => {
  if (SENSOR_COLORS[name]) return SENSOR_COLORS[name];
  const palette = [
    "#2563EB",
    "#16A34A",
    "#F59E0B",
    "#DB2777",
    "#0EA5E9",
    "#9333EA",
    "#EA580C",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length] || SENSOR_COLORS.DEFAULT;
};

const clamp = (v: number | null | undefined, min = -40, max = 110) => {
  if (v == null || Number.isNaN(v as number)) return null;
  return Math.max(min, Math.min(max, Number(v)));
};

const TemperatureEffectivenessChart: React.FC = () => {
  const { allRooms, historyData } = useContext(WeatherContext);

  // Configuración de límites
  const MIN_LIMIT = -20;
  const MAX_LIMIT = -5;

  // Calcular promedio de temperatura por sensor
  const avgData = useMemo(() => {
    if (!historyData || !allRooms?.length) return [];

    return allRooms.map((room) => {
      const key = room.devEUI ?? room.name;
      const history: Measure[] = historyData[key] || [];

      const temps = history
        .map((h) => clamp((h as any)?.temperature ?? null))
        .filter((v): v is number => v !== null && !isNaN(v));

      const avgTemp =
        temps.length > 0
          ? temps.reduce((a, b) => a + b, 0) / temps.length
          : 0;

      return {
        zone: room.deviceName || room.name || key,
        avgTemp: Number(avgTemp.toFixed(2)),
        color: pickColor(room.name || key),
      };
    });
  }, [allRooms, historyData]);

  const labels = avgData.map((d) => d.zone);
  const values = avgData.map((d) => d.avgTemp);
  const colors = avgData.map((d) =>
    d.avgTemp < MIN_LIMIT || d.avgTemp > MAX_LIMIT ? "#f59e0b" : "#16a34a"
  );

  // ✅ CORRECCIÓN: usar tipo mixto "bar" | "line"
  const chartData: any = {
    labels,
    datasets: [
      {
        type: "bar" as const,
        label: "Promedio Temperatura (°C)",
        data: values,
        backgroundColor: colors,
        borderColor: "#111827",
        borderWidth: 1,
        barThickness: 45,
      },
      {
        type: "line" as const,
        label: "Límite min (config.)",
        data: Array(labels.length).fill(MIN_LIMIT),
        borderColor: "rgba(107,114,128,0.6)",
        borderDash: [6, 4],
        fill: false,
        pointRadius: 0,
        borderWidth: 1.5,
      },
      {
        type: "line" as const,
        label: "Límite max (config.)",
        data: Array(labels.length).fill(MAX_LIMIT),
        borderColor: "rgba(107,114,128,0.6)",
        borderDash: [6, 4],
        fill: false,
        pointRadius: 0,
        borderWidth: 1.5,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          color: "#374151",
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: "rgba(17,24,39,0.85)",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        callbacks: {
          label: (ctx: any) =>
            `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)} °C`,
        },
      },
      title: {
        display: true,
        text: "Efectividad de Temperatura — Promedio por Zona",
        font: { size: 15, weight: "bold" },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Zona", font: { weight: "bold" } },
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { color: "#6b7280" },
      },
      y: {
        min: -40,
        max: 80,
        title: { display: true, text: "°C" },
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { stepSize: 10, color: "#6b7280" },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 h-[420px] md:h-[480px]">
      {avgData.length > 0 ? (
        <Chart type="bar" data={chartData} options={options} />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          Sin datos disponibles
        </div>
      )}
    </div>
  );
};

export default TemperatureEffectivenessChart;
