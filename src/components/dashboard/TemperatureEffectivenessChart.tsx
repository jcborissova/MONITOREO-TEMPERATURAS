/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useContext, useMemo } from "react";
import { Chart as ChartJS, registerables } from "chart.js";
import { Chart } from "react-chartjs-2";
import { WeatherContext } from "../../context/WeatherContext";
import type { Measure } from "../../types/types";

ChartJS.register(...registerables);

const TemperatureEffectivenessChart: React.FC = () => {
  const { sensors, historyData } = useContext(WeatherContext);

  // 🔹 Rango ideal (ajustable)
  const MIN_LIMIT = -20;
  const MAX_LIMIT = -5;

  const clamp = (v: number | null | undefined, min = -40, max = 110) => {
    if (v == null || Number.isNaN(v as number)) return null;
    return Math.max(min, Math.min(max, Number(v)));
  };

  // 🔸 Calcular temperatura promedio por sensor / zona
  const avgData = useMemo(() => {
    if (!sensors?.length || !historyData) return [];

    return sensors.map((sensor) => {
      const key = sensor.devEUI ?? sensor.name;
      const history: Measure[] = historyData[key] || [];

      const temps = history
        .map((h) => clamp((h as any)?.temperature ?? (h as any)?.data?.temperature))
        .filter((v): v is number => v !== null && !isNaN(v));

      const avgTemp =
        temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;

      return {
        zone: sensor.deviceName || sensor.name || key,
        avgTemp: Number(avgTemp.toFixed(2)),
      };
    });
  }, [sensors, historyData]);

  // 🔹 Estructura de datos para el gráfico
  const labels = avgData.map((d) => d.zone);
  const values = avgData.map((d) => d.avgTemp);

  // 🔸 Colores con lógica más elegante (verde dentro del rango, ámbar si cerca del límite, rojo si fuera)
  const colors = avgData.map((d) => {
    if (d.avgTemp < MIN_LIMIT - 3 || d.avgTemp > MAX_LIMIT + 3) return "#EF4444"; // rojo
    if (d.avgTemp < MIN_LIMIT || d.avgTemp > MAX_LIMIT) return "#F59E0B"; // ámbar
    return "#16A34A"; // verde
  });

  const data = {
    labels,
    datasets: [
      {
        type: "bar" as const,
        label: "Promedio de Temperatura (°C)",
        data: values,
        backgroundColor: colors,
        borderColor: "#1F2937",
        borderWidth: 0.8,
        barThickness: 38,
        borderRadius: 6,
        hoverBackgroundColor: "#3B82F6",
      },
      {
        type: "line" as const,
        label: "Límite Mínimo",
        data: Array(labels.length).fill(MIN_LIMIT),
        borderColor: "rgba(107,114,128,0.6)",
        borderDash: [6, 4],
        borderWidth: 1.2,
        pointRadius: 0,
      },
      {
        type: "line" as const,
        label: "Límite Máximo",
        data: Array(labels.length).fill(MAX_LIMIT),
        borderColor: "rgba(107,114,128,0.6)",
        borderDash: [6, 4],
        borderWidth: 1.2,
        pointRadius: 0,
      },
    ],
  };

  // ⚙️ Configuración visual refinada
  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          color: "#374151",
          font: { size: 13, family: "Inter, sans-serif" },
        },
      },
      title: {
        display: true,
        text: "Efectividad de Temperatura — Promedio por Zona",
        font: { size: 15, weight: "600", family: "Inter, sans-serif" },
        color: "#111827",
        padding: { bottom: 15 },
      },
      tooltip: {
        mode: "index",
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
          label: (ctx: any) =>
            `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)} °C`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Zona", color: "#6B7280" },
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: {
          color: "#6B7280",
          font: { size: 12, family: "Inter, sans-serif" },
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        min: -40,
        max: 80,
        title: { display: true, text: "°C", color: "#6B7280" },
        ticks: {
          stepSize: 10,
          color: "#6B7280",
          font: { size: 12, family: "Inter, sans-serif" },
        },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
    },
    animation: {
      duration: 800,
      easing: "easeOutCubic",
    },
  };

  const hasData = avgData.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 h-[400px]">
      {hasData ? (
        <Chart type="bar" data={data} options={options} />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          Sin datos disponibles
        </div>
      )}
    </div>
  );
};

export default TemperatureEffectivenessChart;
