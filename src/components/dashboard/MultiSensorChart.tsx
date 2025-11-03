/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useContext, useMemo, useRef, useState } from "react";
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
  Colors,
  Title,
  SubTitle,
  type ChartOptions,
  type TooltipItem,
  type ChartDataset,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import { WeatherContext } from "../../context/WeatherContext";
import type { Measure } from "../../types/types";
import {
  CloudIcon,
  FireIcon,
  ArrowPathIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/solid";

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

/* =========================
   Helpers
========================= */

type RangeType = "24h" | "7d" | "30d" | "custom" | "all";

/** Color HSL estable por índice */
const colorOf = (idx: number, alpha = 1) => {
  const hue = (idx * 137.508) % 360;
  return `hsla(${hue},70%,55%,${alpha})`;
};

/** Clamp numérico tolerante */
const clamp = (v: unknown, min = -40, max = 110): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : null;
};

/** Parseo de fecha tolerante: number | string | Date | null -> Date válida o época 0 */
const toSafeDate = (v: unknown): Date => {
  if (v == null) return new Date(0);
  if (v instanceof Date) return isNaN(v.getTime()) ? new Date(0) : v;
  if (typeof v === "number") {
    const ms = v < 9_999_999_999 ? v * 1000 : v; // segundos vs ms
    const d = new Date(ms);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }
  if (typeof v === "string") {
    const s = v.includes(" ") ? v.replace(" ", "T") : v; // "YYYY-MM-DD HH:mm:ss"
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }
  const d = new Date(v as any);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

/** Genera timestamps iso hacia atrás desde ahora */
const makeSegments = (hours: number, divisions: number): string[] => {
  const now = Date.now();
  const step = (hours * 3600_000) / divisions;
  const out: string[] = [];
  for (let i = divisions - 1; i >= 0; i--) {
    out.push(new Date(now - i * step).toISOString());
  }
  return out;
};

/* =========================
   Componente
========================= */

const MultiSensorChart: React.FC = () => {
  const { sensors, historyData } = useContext(WeatherContext); // { key -> Measure[] }

  const [showTemp, setShowTemp] = useState(true);
  const [showHum, setShowHum] = useState(true);
  const [rangeType, setRangeType] = useState<RangeType>("7d");
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [fullscreen, setFullscreen] = useState(false);
  const chartRef = useRef<any>(null);

  /** Unifica timeline y series por sensor */
  const unified = useMemo(() => {
    const tsSet = new Set<string>();

    sensors.forEach((s) => {
      const key = s.devEUI ?? s.name;
      const hist: Measure[] = historyData[key] || [];
      for (const item of hist) {
        const raw =
          (item as any)?.timestamp ??
          (item as any)?.created_at ??
          (item as any)?.updatedAt ??
          (item as any)?.date;
        if (!raw) continue;
        const d = toSafeDate(raw);
        if (d.getTime() > 0) tsSet.add(d.toISOString());
      }
    });

    const time = Array.from(tsSet).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const idxOf: Record<string, number> = {};
    time.forEach((iso, i) => (idxOf[iso] = i));

    const series: Record<string, { temperature: (number | null)[]; humidity: (number | null)[] }> =
      {};

    sensors.forEach((s) => {
      const key = s.devEUI ?? s.name;
      const label = (s as any).deviceName || s.name || key;
      const hist: Measure[] = historyData[key] || [];

      if (!series[label]) {
        series[label] = {
          temperature: Array(time.length).fill(null),
          humidity: Array(time.length).fill(null),
        };
      }

      for (const item of hist) {
        const raw =
          (item as any)?.timestamp ??
          (item as any)?.created_at ??
          (item as any)?.updatedAt ??
          (item as any)?.date;
        if (!raw) continue;
        const iso = toSafeDate(raw).toISOString();
        const i = idxOf[iso];
        if (i == null) continue;

        const tVal =
          clamp((item as any)?.temperature ?? (item as any)?.data?.temperature) ?? null;
        const hVal =
          clamp(
            (item as any)?.humedity ??
              (item as any)?.humidity ??
              (item as any)?.data?.humidity,
            0,
            100
          ) ?? null;

        series[label].temperature[i] = tVal;
        series[label].humidity[i] = hVal;
      }
    });

    return { time, series };
  }, [sensors, historyData]);

  /** Aplica segmentación/agrupación por rango */
  const filtered = useMemo(() => {
    if (!unified.time.length) return unified;

    let hours = 24;
    let divisions = 48;

    if (rangeType === "24h") {
      hours = 24;
      divisions = 48;
    } else if (rangeType === "7d") {
      hours = 7 * 24;
      divisions = 56; // cada 3h aprox
    } else if (rangeType === "30d") {
      hours = 30 * 24;
      divisions = 60;
    } else if (rangeType === "custom") {
      if (!(customRange.start && customRange.end)) return unified;
      const start = toSafeDate(customRange.start).getTime();
      const end = toSafeDate(customRange.end).getTime();
      if (!(end > start)) return unified;
      const diffHrs = (end - start) / 3_600_000;
      hours = diffHrs;
      divisions = diffHrs <= 24 ? 48 : diffHrs <= 24 * 7 ? 56 : 60;
    } else {
      // "all"
      return unified;
    }

    const segments = makeSegments(hours, divisions);
    const out: typeof unified.series = {};
    const baseTimes = unified.time.map((t) => toSafeDate(t).getTime());

    Object.entries(unified.series).forEach(([name, vals]) => {
      const temp: (number | null)[] = [];
      const hum: (number | null)[] = [];

      segments.forEach((segIso) => {
        const segTime = toSafeDate(segIso).getTime();
        let idx = -1;
        let best = Number.POSITIVE_INFINITY;
        for (let i = 0; i < baseTimes.length; i++) {
          const delta = Math.abs(baseTimes[i] - segTime);
          if (delta < best) {
            best = delta;
            idx = i;
          }
        }

        if (best <= 90 * 60 * 1000 && idx !== -1) {
          temp.push(vals.temperature[idx]);
          hum.push(vals.humidity[idx]);
        } else {
          temp.push(null);
          hum.push(null);
        }
      });

      out[name] = { temperature: temp, humidity: hum };
    });

    return { time: segments, series: out };
  }, [unified, rangeType, customRange]);

  /** Datasets */
  const datasets = useMemo<ChartDataset<"line", (number | null)[]>[]>(() => {
    const arr: ChartDataset<"line", (number | null)[]>[] = [];
    const entries = Object.entries(filtered.series);

    entries.forEach(([name, vals], idx) => {
      const main = colorOf(idx, 1);
      const fill = colorOf(idx, 0.15);

      if (showTemp) {
        arr.push({
          type: "line",
          label: `${name} °C`,
          data: vals.temperature,
          borderColor: main,
          backgroundColor: fill,
          fill: true,
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 0,
          spanGaps: true,
          yAxisID: "y",
        });
      }

      if (showHum) {
        arr.push({
          type: "line",
          label: `${name} %RH`,
          data: vals.humidity,
          borderColor: main,
          backgroundColor: "transparent",
          borderDash: [6, 4],
          borderWidth: 1.5,
          tension: 0.35,
          pointRadius: 0,
          spanGaps: true,
          yAxisID: "y",
        });
      }
    });

    return arr;
  }, [filtered.series, showTemp, showHum]);

  /** Datos del chart */
  const chartData = useMemo(
    () => ({
      labels: filtered.time.map((t) => toSafeDate(t)),
      datasets,
    }),
    [filtered.time, datasets]
  );

  /** Opciones */
  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: "easeInOutQuart" },
      plugins: {
        title: {
          display: true,
          text: "Evolución de Temperatura y Humedad",
          color: "#111827",
          font: { size: 16, weight: "bold" },
        },
        legend: {
          position: "bottom",
          labels: { usePointStyle: true, padding: 12, font: { size: 12 } },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: "#111827",
          titleColor: "#fff",
          bodyColor: "#d1d5db",
          borderColor: "#374151",
          borderWidth: 1,
          callbacks: {
            title: (ctx: TooltipItem<"line">[]) => {
              const x = Number(ctx?.[0]?.parsed?.x ?? 0);
              return new Date(x).toLocaleString("es-DO", {
                weekday: "short",
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "short",
              });
            },
            label: (ctx) => {
              const y = typeof ctx.parsed?.y === "number" ? ctx.parsed.y : null;
              const isTemp = ctx.dataset.label?.includes("°C");
              if (y == null) return isTemp ? "Temperatura: —" : "Humedad: —";
              return isTemp
                ? `Temperatura: ${y.toFixed(1)} °C`
                : `Humedad: ${y.toFixed(1)} %`;
            },
          },
        },
        zoom: {
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
          pan: { enabled: true, mode: "x", modifierKey: "shift" },
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: rangeType === "24h" ? "hour" : "day",
            displayFormats: rangeType === "24h" ? { hour: "HH:mm" } : { day: "dd/MM" },
          },
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
    }),
    [rangeType]
  );

  const hasData = useMemo(
    () => datasets.some((d) => (d.data as (number | null)[]).some((v) => v != null)),
    [datasets]
  );

  /* =========================
      Render
  ========================= */
  return (
    <div className={`w-full min-w-0 ${fullscreen ? "fixed inset-0 bg-white z-50 p-3 sm:p-6" : ""} transition-all`}>
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
        <button
          onClick={() => setShowTemp((v) => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition ${
            showTemp ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          <FireIcon className="w-4 h-4" /> Temperatura
        </button>

        <button
          onClick={() => setShowHum((v) => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition ${
            showHum ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          <CloudIcon className="w-4 h-4" /> Humedad
        </button>

        <button
          onClick={() => chartRef.current?.resetZoom?.()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          <ArrowPathIcon className="w-4 h-4" /> Reset Zoom
        </button>

        <button
          onClick={() => setFullscreen((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          <ArrowsPointingOutIcon className="w-4 h-4" /> {fullscreen ? "Salir" : "Pantalla completa"}
        </button>

        {/* Rangos */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 ml-auto">
          {(["24h", "7d", "30d", "custom", "all"] as RangeType[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setRangeType(opt)}
              className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs rounded-full font-medium border transition ${
                rangeType === opt
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
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

      {rangeType === "custom" && (
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-3">
          <input
            type="datetime-local"
            value={customRange.start}
            onChange={(e) => setCustomRange((r) => ({ ...r, start: e.target.value }))}
            className="border rounded-md px-2 py-1 text-xs sm:text-sm text-gray-700 focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="datetime-local"
            value={customRange.end}
            onChange={(e) => setCustomRange((r) => ({ ...r, end: e.target.value }))}
            className="border rounded-md px-2 py-1 text-xs sm:text-sm text-gray-700 focus:ring-2 focus:ring-blue-400"
          />
        </div>
      )}

      {/* Gráfico */}
      <div
        className={`bg-white border border-gray-200 rounded-2xl shadow-sm p-3 sm:p-4 md:p-6 overflow-hidden transition-all min-w-0 ${
          fullscreen ? "h-[85vh]" : "h-[380px] sm:h-[440px] md:h-[500px]"
        }`}
      >
        {hasData ? (
          <Line ref={chartRef} data={chartData} options={options} />
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
