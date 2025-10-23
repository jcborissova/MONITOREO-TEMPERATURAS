/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useContext, useMemo, useState, useRef } from "react";
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
  type ChartOptions,
  Colors,
  Title,
  SubTitle,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import { WeatherContext } from "../../context/WeatherContext";
import type { Measure } from "../../types/types";
import { CloudIcon, FireIcon, ArrowPathIcon } from "@heroicons/react/24/solid";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  Decimation,
  Colors,
  Title,
  SubTitle,
  zoomPlugin
);

/** 🎨 Genera un color HSL distinto para cada sensor */
const generateColor = (index: number, alpha = 1): string => {
  const hue = (index * 137.508) % 360;
  return `hsla(${hue}, 70%, 55%, ${alpha})`;
};

/** 🔢 Genera divisiones de tiempo equidistantes tomando la hora actual como referencia */
const generateTimeSegments = (hours: number, divisions: number): string[] => {
  const now = new Date();
  const result: string[] = [];
  const interval = (hours * 60 * 60 * 1000) / divisions;
  for (let i = divisions - 1; i >= 0; i--) {
    result.push(new Date(now.getTime() - i * interval).toISOString());
  }
  return result;
};

/** 🔒 Asegura valores válidos */
const clamp = (v: number | null | undefined, min = -40, max = 110) => {
  if (v == null || Number.isNaN(v)) return null;
  return Math.max(min, Math.min(max, Number(v)));
};

const MultiSensorChart: React.FC = () => {
  const { sensors, historyData } = useContext(WeatherContext);
  const [showTemp, setShowTemp] = useState(true);
  const [showHum, setShowHum] = useState(true);
  const [rangeType, setRangeType] = useState<"24h" | "7d" | "30d" | "custom" | "all">("7d");
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const chartRef = useRef<any>(null);

  /** 🔹 Unificar datos históricos */
  const unified = useMemo(() => {
    const timeSet = new Set<string>();
    const series: Record<string, { temperature: (number | null)[]; humidity: (number | null)[] }> = {};

    sensors.forEach((sensor) => {
      const key = sensor.devEUI ?? sensor.name;
      if (!key) return;
      const history: Measure[] = historyData[key] || [];
      history.forEach((h) => {
        const raw = (h as any)?.timestamp ?? (h as any)?.created_at ?? (h as any)?.updatedAt ?? (h as any)?.date;
        if (!raw) return;
        const t = new Date(String(raw).replace(" ", "T"));
        if (!isNaN(t.getTime())) timeSet.add(t.toISOString());
      });
    });

    const times = Array.from(timeSet).sort((a, b) => a.localeCompare(b));
    sensors.forEach((sensor) => {
      const key = sensor.devEUI ?? sensor.name;
      const label = sensor.deviceName || sensor.name || key;
      const history: Measure[] = historyData[key] || [];
      if (!series[label]) series[label] = { temperature: [], humidity: [] };

      times.forEach((iso) => {
        const found = history.find((m) => {
          const raw = (m as any)?.timestamp ?? (m as any)?.created_at ?? (m as any)?.updatedAt ?? (m as any)?.date;
          if (!raw) return false;
          return new Date(String(raw).replace(" ", "T")).toISOString() === iso;
        });

        const tVal = clamp(found?.temperature ?? (found as any)?.data?.temperature);
        const hVal = clamp((found as any)?.humidity ?? (found as any)?.humedity ?? (found as any)?.data?.humidity);
        series[label].temperature.push(tVal);
        series[label].humidity.push(hVal);
      });
    });

    return { time: times, series };
  }, [sensors, historyData]);

  /** 🔹 Segmentos de tiempo según rango */
  const filtered = useMemo(() => {
    if (!unified.time.length) return unified;

    let hours = 24;
    let divisions = 48; // Default 24h

    switch (rangeType) {
      case "24h":
        hours = 24;
        divisions = 48;
        break;
      case "7d":
        hours = 7 * 24;
        divisions = 56;
        break;
      case "30d":
        hours = 30 * 24;
        divisions = 60;
        break;
      case "custom":
        if (customRange.start && customRange.end) {
          const start = new Date(customRange.start);
          const end = new Date(customRange.end);
          const diffHours = (end.getTime() - start.getTime()) / 3600000;
          if (diffHours <= 24) divisions = 48;
          else if (diffHours <= 24 * 7) divisions = 56;
          else divisions = 60;
          hours = diffHours;
        } else {
          return unified;
        }
        break;
      case "all":
        return unified;
    }

    const timeSegments = generateTimeSegments(hours, divisions);
    const filteredSeries: typeof unified.series = {};

    Object.entries(unified.series).forEach(([sensor, values]) => {
      filteredSeries[sensor] = { temperature: [], humidity: [] };

      timeSegments.forEach((time) => {
        const closestIdx = unified.time.findIndex(
          (t) => Math.abs(new Date(t).getTime() - new Date(time).getTime()) < 90 * 60 * 1000
        ); // tolerancia 1.5h
        if (closestIdx !== -1) {
          filteredSeries[sensor].temperature.push(values.temperature[closestIdx]);
          filteredSeries[sensor].humidity.push(values.humidity[closestIdx]);
        } else {
          filteredSeries[sensor].temperature.push(null);
          filteredSeries[sensor].humidity.push(null);
        }
      });
    });

    return { time: timeSegments, series: filteredSeries };
  }, [unified, rangeType, customRange.start, customRange.end]);

  /** 🎨 Datasets */
  const datasets = useMemo(() => {
    const sets: any[] = [];
    Object.entries(filtered.series).forEach(([sensor, values], idx) => {
      const color = generateColor(idx);
      const faded = generateColor(idx, 0.1);

      if (showTemp)
        sets.push({
          label: `${sensor} · °C`,
          data: values.temperature,
          borderColor: color,
          backgroundColor: faded,
          fill: true,
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 0,
        });

      if (showHum)
        sets.push({
          label: `${sensor} · %RH`,
          data: values.humidity,
          borderColor: color,
          borderDash: [6, 4],
          borderWidth: 1.5,
          tension: 0.35,
          pointRadius: 0,
        });
    });
    return sets;
  }, [filtered.series, showTemp, showHum]);

  const chartData = {
    labels: filtered.time.map((t) => new Date(t)),
    datasets,
  };

  /** ⚙️ Configuración del gráfico */
  const chartOptions: ChartOptions<"line"> & { plugins?: any } = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: "Evolución de Temperatura y Humedad por Sensor",
        color: "#111827",
        font: { size: 16, weight: 600 },
      },
      legend: {
        position: "bottom",
        labels: { usePointStyle: true, padding: 12, font: { size: 12 } },
      },
      zoom: {
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
        pan: { enabled: true, mode: "x" },
      },
    },
    scales: {
      x: {
        type: "time",
        time: { unit: "hour", displayFormats: { hour: "dd/MM HH:mm" } },
        ticks: { color: "#6b7280" },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      y: {
        min: -40,
        max: 110,
        ticks: { stepSize: 10, color: "#6b7280" },
        title: { display: true, text: "°C / %RH", color: "#111827" },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
    },
  };

  const hasData =
    filtered.time.length > 0 &&
    datasets.some((d) => d.data.some((v: number | null) => v !== null));

  return (
    <div className="w-full">
      {/* 🔹 Controles */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <button
          onClick={() => setShowTemp(!showTemp)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            showTemp ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          <FireIcon className="w-4 h-4" /> Temperatura
        </button>
        <button
          onClick={() => setShowHum(!showHum)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            showHum ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          <CloudIcon className="w-4 h-4" /> Humedad
        </button>
        <button
          onClick={() => chartRef.current?.resetZoom()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-600"
        >
          <ArrowPathIcon className="w-4 h-4" /> Reset Zoom
        </button>

        {/* 🔹 Selector de rango */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {["24h", "7d", "30d", "custom", "all"].map((opt) => (
            <button
              key={opt}
              onClick={() => setRangeType(opt as any)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium border ${
                rangeType === opt
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              }`}
            >
              {opt === "24h"
                ? "24 horas"
                : opt === "7d"
                ? "7 días"
                : opt === "30d"
                ? "30 días"
                : opt === "custom"
                ? "Personalizado"
                : "Todo"}
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
      <div className="h-[420px] md:h-[480px] bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6">
        {hasData ? (
          <Line ref={chartRef} data={chartData} options={chartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Sin datos disponibles
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSensorChart;
