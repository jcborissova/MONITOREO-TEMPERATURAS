/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useContext, useMemo } from "react";
import { Chart as ChartJS, registerables } from "chart.js";
import { Chart } from "react-chartjs-2";
import { WeatherContext } from "../../context/WeatherContext";
import type { Measure } from "../../types/types";

// ✅ Registra todos los controladores y elementos (bar, line, pie, etc.)
ChartJS.register(...registerables);

const TemperatureEffectivenessChart: React.FC = () => {
  const { allRooms, historyData } = useContext(WeatherContext);

  const MIN_LIMIT = -20;
  const MAX_LIMIT = -5;

  const clamp = (v: number | null | undefined, min = -40, max = 110) => {
    if (v == null || Number.isNaN(v as number)) return null;
    return Math.max(min, Math.min(max, Number(v)));
  };

  const avgData = useMemo(() => {
    if (!historyData || !allRooms?.length) return [];

    return allRooms.map((room) => {
      const key = room.devEUI ?? room.name;
      const history: Measure[] = historyData[key] || [];

      const temps = history
        .map((h) => clamp((h as any)?.temperature ?? null))
        .filter((v): v is number => v !== null && !isNaN(v));

      const avgTemp =
        temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;

      return {
        zone: room.deviceName || room.name || key,
        avgTemp: Number(avgTemp.toFixed(2)),
      };
    });
  }, [allRooms, historyData]);

  const labels = avgData.map((d) => d.zone);
  const values = avgData.map((d) => d.avgTemp);
  const colors = avgData.map((d) =>
    d.avgTemp < MIN_LIMIT || d.avgTemp > MAX_LIMIT ? "#f59e0b" : "#16a34a"
  );

  const data: any = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Promedio Temperatura (°C)",
        data: values,
        backgroundColor: colors,
        borderColor: "#111827",
        borderWidth: 1,
        barThickness: 40,
      },
      {
        type: "line",
        label: "Límite Mínimo",
        data: Array(labels.length).fill(MIN_LIMIT),
        borderColor: "rgba(107,114,128,0.6)",
        borderDash: [6, 4],
        pointRadius: 0,
      },
      {
        type: "line",
        label: "Límite Máximo",
        data: Array(labels.length).fill(MAX_LIMIT),
        borderColor: "rgba(107,114,128,0.6)",
        borderDash: [6, 4],
        pointRadius: 0,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { usePointStyle: true, color: "#374151" },
      },
      title: {
        display: true,
        text: "Efectividad de Temperatura — Promedio por Zona",
        font: { size: 14, weight: "bold" },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) =>
            `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)} °C`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Zona", color: "#6b7280" },
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { color: "#6b7280" },
      },
      y: {
        min: -40,
        max: 80,
        title: { display: true, text: "°C", color: "#6b7280" },
        ticks: { stepSize: 10, color: "#6b7280" },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 h-[400px]">
      {avgData.length > 0 ? (
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
