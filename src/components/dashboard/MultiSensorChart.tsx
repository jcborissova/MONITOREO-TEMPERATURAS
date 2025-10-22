/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useContext, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  Decimation,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import { WeatherContext } from "../../context/WeatherContext";
import type { Measure } from "../../types/types";
import { CloudIcon, FireIcon } from "@heroicons/react/24/solid";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  Decimation
);

const SENSOR_COLORS: Record<string, string> = {
  SALA: "#2563EB",
  COCINA: "#16A34A",
  COCINA2: "#22C55E",
  BANO: "#F59E0B",
  CUARTO: "#DB2777",
  PASILLO: "#0EA5E9",
  DEFAULT: "#64748B",
};

const pickColor = (name: string) => {
  if (SENSOR_COLORS[name]) return SENSOR_COLORS[name];
  const palette = ["#2563EB", "#16A34A", "#F59E0B", "#DB2777", "#0EA5E9", "#9333EA", "#EA580C"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length] || SENSOR_COLORS.DEFAULT;
};

const clamp = (v: number | null | undefined, min = -40, max = 110) => {
  if (v == null || Number.isNaN(v as number)) return null;
  return Math.max(min, Math.min(max, Number(v)));
};

const MultiSensorChart: React.FC = () => {
  const { allRooms, historyData } = useContext(WeatherContext);
  const [showTemp, setShowTemp] = useState(true);
  const [showHum, setShowHum] = useState(true);
  const [rangeType, setRangeType] = useState<"30min" | "1h" | "3h" | "all" | "custom">("1h");
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });

  const unified = useMemo(() => {
    const timeSet = new Set<string>();
    const series: Record<string, { temperature: (number | null)[]; humidity: (number | null)[] }> = {};

    allRooms.forEach((room) => {
      const key = room.devEUI ?? room.name;
      if (!key) return;
      const history: Measure[] = historyData[key] || [];
      history.forEach((h) => {
        const rawTime =
          (h as any)?.timestamp ??
          (h as any)?.created_at ??
          (h as any)?.updatedAt ??
          (h as any)?.date ??
          null;
        if (!rawTime) return;
        const t = new Date(String(rawTime).replace(" ", "T"));
        if (!Number.isNaN(t.getTime())) timeSet.add(t.toISOString());
      });
    });

    const times = Array.from(timeSet).sort((a, b) => a.localeCompare(b));

    allRooms.forEach((room) => {
      const key = room.devEUI ?? room.name;
      if (!key) return;
      const history: Measure[] = historyData[key] || [];
      const label = room.deviceName || room.name || key;

      if (!series[label]) series[label] = { temperature: [], humidity: [] };

      times.forEach((iso) => {
        const found = history.find((m) => {
          const raw =
            (m as any)?.timestamp ??
            (m as any)?.created_at ??
            (m as any)?.updatedAt ??
            (m as any)?.date ??
            null;
          if (!raw) return false;
          const tm = new Date(String(raw).replace(" ", "T"));
          return !Number.isNaN(tm.getTime()) && tm.toISOString() === iso;
        });

        const tVal = clamp(found?.temperature ?? null);
        const hRaw =
          (found as any)?.humedity ??
          (found as any)?.humidity ??
          (found as any)?.hum ??
          (found as any)?.data?.humidity ??
          null;
        const hVal = clamp(hRaw ?? null);

        series[label].temperature.push(tVal);
        series[label].humidity.push(hVal);
      });
    });

    return { time: times, series };
  }, [allRooms, historyData]);

  // 🔎 Filtrado por rango
  const filtered = useMemo(() => {
    if (!unified.time.length) return unified;
    let startTime: number | null = null;
    let endTime: number | null = null;

    const lastTime = new Date(unified.time[unified.time.length - 1]).getTime();

    switch (rangeType) {
      case "30min":
        startTime = lastTime - 30 * 60 * 1000;
        break;
      case "1h":
        startTime = lastTime - 60 * 60 * 1000;
        break;
      case "3h":
        startTime = lastTime - 3 * 60 * 60 * 1000;
        break;
      case "all":
        startTime = null;
        break;
      case "custom":
        if (customRange.start && customRange.end) {
          startTime = new Date(customRange.start).getTime();
          endTime = new Date(customRange.end).getTime();
        }
        break;
    }

    const filteredTime = unified.time.filter((t) => {
      const ts = new Date(t).getTime();
      if (startTime && !endTime) return ts >= startTime;
      if (startTime && endTime) return ts >= startTime && ts <= endTime;
      return true;
    });

    const filteredSeries: typeof unified.series = {};
    Object.entries(unified.series).forEach(([sensor, values]) => {
      const startIdx = unified.time.findIndex((t) => t === filteredTime[0]);
      const endIdx = unified.time.findIndex((t) => t === filteredTime[filteredTime.length - 1]);
      filteredSeries[sensor] = {
        temperature: values.temperature.slice(startIdx, endIdx + 1),
        humidity: values.humidity.slice(startIdx, endIdx + 1),
      };
    });

    return { time: filteredTime, series: filteredSeries };
  }, [unified, rangeType, customRange]);

  // 📊 Datasets
  const datasets = useMemo(() => {
    const sets: any[] = [];
    Object.entries(filtered.series).forEach(([sensor, values]) => {
      const color = pickColor(sensor);
      if (showTemp)
        sets.push({
          label: `${sensor} · °C`,
          data: values.temperature,
          borderColor: color,
          borderWidth: 2,
          borderDash: [],
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 4,
        });
      if (showHum)
        sets.push({
          label: `${sensor} · %RH`,
          data: values.humidity,
          borderColor: color,
          borderWidth: 2,
          borderDash: [3, 5],
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 4,
        });
    });
    return sets;
  }, [filtered.series, showTemp, showHum]);

  const chartData = {
    labels: filtered.time.map((t) => new Date(t)),
    datasets,
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 16, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: "rgba(17,24,39,0.85)",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        titleFont: { size: 13, weight: "bold" },
        bodyFont: { size: 12 },
        callbacks: {
          title: (items: any) =>
            new Date(items[0]?.parsed?.x).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          label: (item: any) => {
            const val = item.parsed?.y;
            const label = item.dataset.label;
            const unit = label.includes("%RH") ? "%RH" : "°C";
            return `${label}: ${val?.toFixed(1)} ${unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: { unit: "minute", displayFormats: { minute: "HH:mm" } },
        title: { display: true, text: "Hora" },
        ticks: { color: "#6b7280" },
      },
      y: {
        min: -40,
        max: 110,
        title: { display: true, text: "Nivel (°C / %RH)" },
        ticks: { stepSize: 10, color: "#6b7280" },
      },
    },
  };

  const hasData =
    filtered.time.length > 0 &&
    datasets.some((d) => d.data.some((v: number | null) => v !== null));

  return (
    <div className="w-full">
      {/* 🔹 Controles principales */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <button
          onClick={() => setShowTemp(!showTemp)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
            showTemp ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          <FireIcon className="w-4 h-4" /> Temperatura
        </button>
        <button
          onClick={() => setShowHum(!showHum)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
            showHum ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          <CloudIcon className="w-4 h-4" /> Humedad
        </button>

        {/* 🔹 Selector de rango */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {["30min", "1h", "3h", "all", "custom"].map((opt) => (
            <button
              key={opt}
              onClick={() => setRangeType(opt as any)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium border ${
                rangeType === opt
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
              }`}
            >
              {opt === "30min"
                ? "30 min"
                : opt === "1h"
                ? "1 hora"
                : opt === "3h"
                ? "3 horas"
                : opt === "all"
                ? "Todo"
                : "Personalizado"}
            </button>
          ))}
        </div>
      </div>

      {/* 🔹 Rango personalizado */}
      {rangeType === "custom" && (
        <div className="flex flex-wrap gap-3 mb-3">
          <input
            type="datetime-local"
            value={customRange.start}
            onChange={(e) => setCustomRange((r) => ({ ...r, start: e.target.value }))}
            className="border rounded-md px-2 py-1 text-sm text-gray-700"
          />
          <input
            type="datetime-local"
            value={customRange.end}
            onChange={(e) => setCustomRange((r) => ({ ...r, end: e.target.value }))}
            className="border rounded-md px-2 py-1 text-sm text-gray-700"
          />
        </div>
      )}

      {/* 🔹 Gráfico */}
      <div className="h-[420px] md:h-[480px] bg-gray-50 border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6">
        {hasData ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Sin datos
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSensorChart;
