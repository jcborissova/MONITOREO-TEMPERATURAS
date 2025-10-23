/* eslint-disable @typescript-eslint/no-unused-vars */
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
  type ChartOptions,
  Colors,
  Title,
  SubTitle} from "chart.js";
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
  const hue = (index * 137.508) % 360; // separación dorada
  return `hsla(${hue}, 70%, 55%, ${alpha})`;
};

const clamp = (v: number | null | undefined, min = -40, max = 110) => {
  if (v == null || Number.isNaN(v as number)) return null;
  return Math.max(min, Math.min(max, Number(v)));
};

const MultiSensorChart: React.FC = () => {
  const { sensors, historyData } = useContext(WeatherContext);
  const [showTemp, setShowTemp] = useState(true);
  const [showHum, setShowHum] = useState(true);
  const [rangeType, setRangeType] = useState<"30min" | "1h" | "3h" | "all" | "custom">("1h");
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });

  /** 🔹 Consolidar datos históricos */
  const unified = useMemo(() => {
    const timeSet = new Set<string>();
    const series: Record<string, { temperature: (number | null)[]; humidity: (number | null)[] }> =
      {};

    sensors.forEach((sensor) => {
      const key = sensor.devEUI ?? sensor.name;
      if (!key) return;
      const history: Measure[] = historyData[key] || [];
      history.forEach((h) => {
        const raw =
          (h as any)?.timestamp ??
          (h as any)?.created_at ??
          (h as any)?.updatedAt ??
          (h as any)?.date;
        if (!raw) return;
        const t = new Date(String(raw).replace(" ", "T"));
        if (!Number.isNaN(t.getTime())) timeSet.add(t.toISOString());
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
          const raw =
            (m as any)?.timestamp ??
            (m as any)?.created_at ??
            (m as any)?.updatedAt ??
            (m as any)?.date;
          if (!raw) return false;
          const tm = new Date(String(raw).replace(" ", "T"));
          return !Number.isNaN(tm.getTime()) && tm.toISOString() === iso;
        });

        const tVal = clamp(found?.temperature ?? (found as any)?.data?.temperature);
        const hVal = clamp(
          (found as any)?.humidity ??
            (found as any)?.humedity ??
            (found as any)?.data?.humidity
        );

        series[label].temperature.push(tVal);
        series[label].humidity.push(hVal);
      });
    });

    return { time: times, series };
  }, [sensors, historyData]);

  /** 🔹 Filtrado por rango */
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

  /** 🎨 Datasets con color y estilo únicos */
  const datasets = useMemo(() => {
    const sets: any[] = [];
    Object.entries(filtered.series).forEach(([sensor, values], idx) => {
      const base = generateColor(idx);
      const faded = generateColor(idx, 0.1);

      if (showTemp)
        sets.push({
          label: `${sensor} · °C`,
          data: values.temperature,
          borderColor: base,
          backgroundColor: faded,
          fill: true,
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 1,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: base,
        });
      if (showHum)
        sets.push({
          label: `${sensor} · %RH`,
          data: values.humidity,
          borderColor: base,
          borderDash: [6, 4],
          borderWidth: 1.5,
          fill: false,
          tension: 0.35,
          pointRadius: 1,
          pointHoverRadius: 4,
        });
    });
    return sets;
  }, [filtered.series, showTemp, showHum]);

  const chartData = {
    labels: filtered.time.map((t) => new Date(t)),
    datasets,
  };

  /** ⚙️ Opciones interactivas avanzadas */
  const chartOptions: ChartOptions<"line"> & { plugins?: any } = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "nearest",
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: "Evolución de Temperatura y Humedad por Sensor",
        color: "#111827",
        font: { size: 16, weight: 600 },
      },
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 16,
          font: { size: 12 },
        },
        onHover: (_e, item, legend) => {
          const chart = legend.chart;
          chart.setDatasetVisibility(item.datasetIndex ?? 0, true);
          chart.update();
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(17,24,39,0.9)",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        callbacks: {
          title: (items) => {
            const x = items?.[0]?.parsed?.x;
            if (x == null) return "";
            return new Date(x).toLocaleTimeString("es-DO", {
              hour: "2-digit",
              minute: "2-digit",
            });
          },
          label: (item) => {
            const val = item.parsed.y;
            const unit = item.dataset.label?.includes("%RH") ? "%RH" : "°C";
            return `${item.dataset.label}: ${val?.toFixed(1)} ${unit}`;
          },
        },
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          drag: { enabled: false },
          mode: "x",
        },
        pan: {
          enabled: true,
          mode: "x",
        },
        limits: {
          x: { min: "original", max: "original" },
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: { unit: "minute", displayFormats: { minute: "HH:mm" } },
        ticks: { color: "#6b7280", maxRotation: 0 },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      y: {
        min: -40,
        max: 110,
        title: {
          display: true,
          text: "Nivel (°C / %RH)",
          color: "#111827",
        },
        ticks: { stepSize: 10, color: "#6b7280" },
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
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition"
        >
          <ArrowPathIcon className="w-4 h-4" /> Reset Zoom
        </button>

        {/* 🔹 Selector de rango */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {["30min", "1h", "3h", "all", "custom"].map((opt) => (
            <button
              key={opt}
              onClick={() => setRangeType(opt as any)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium border transition ${
                rangeType === opt
                  ? "bg-gray-900 text-white border-gray-900 shadow-sm"
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
      <div className="h-[420px] md:h-[480px] bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6">
        {hasData ? (
          <Line data={chartData} options={chartOptions} />
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
