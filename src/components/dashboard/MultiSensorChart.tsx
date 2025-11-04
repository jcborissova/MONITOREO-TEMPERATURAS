/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  Legend,
  Brush,
  ReferenceArea,
} from "recharts";
import { WeatherContext } from "../../context/WeatherContext";
import type { Measure } from "../../types/types";
import { CloudIcon, FireIcon, ArrowPathIcon } from "@heroicons/react/24/solid";

/* =========================================
   Helpers
========================================= */

type RangeType = "24h" | "7d" | "30d" | "all" | "custom";

const PRESET_DIVISIONS: Record<Exclude<RangeType, "all" | "custom">, number> = {
  "24h": 48, // cada 30 min
  "7d": 56,  // cada 3 h
  "30d": 60, // cada 12 h
};

const colorOf = (idx: number, alpha = 1) => {
  const hue = (idx * 137.508) % 360;
  const a = Math.max(0, Math.min(1, alpha));
  return `hsla(${hue},70%,50%,${a})`;
};

const clamp = (v: unknown, min = -40, max = 110): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : null;
};

const toSafeDate = (v: unknown): Date => {
  if (v == null) return new Date(0);
  if (v instanceof Date) return isNaN(v.getTime()) ? new Date(0) : v;
  if (typeof v === "number") {
    const ms = v < 9_999_999_999 ? v * 1000 : v;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }
  if (typeof v === "string") {
    const s = v.includes(" ") ? v.replace(" ", "T") : v;
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }
  const d = new Date(v as any);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

const fmtTick = (iso: string) =>
  new Date(iso).toLocaleString("es-DO", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/* =========================================
   Componente
========================================= */

const MultiSensorTimelineRecharts: React.FC = () => {
  const { sensors, historyData } = useContext(WeatherContext);

  // Toggles
  const [showTemp, setShowTemp] = useState(true);
  const [showHum, setShowHum] = useState(true);

  // Brush controlado
  const [brushKey, setBrushKey] = useState(0);
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({});

  // Filtros / Rango actual
  const [rangeType, setRangeType] = useState<RangeType>("7d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [rangeError, setRangeError] = useState<string>("");

  // ===== 1) Normaliza timeline & series crudas =====
  const unified = useMemo(() => {
    const tsSet = new Set<string>();

    sensors.forEach((s) => {
      const key = (s as any).devEUI ?? s.name;
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

    const labelOf = (s: any) => (s?.deviceName || s?.name || s?.devEUI || "Sensor");

    sensors.forEach((s) => {
      const key = (s as any).devEUI ?? s.name;
      const label = labelOf(s);
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

        const tVal = clamp((item as any)?.temperature ?? (item as any)?.data?.temperature);
        const hVal = clamp(
          (item as any)?.humedity ??
            (item as any)?.humidity ??
            (item as any)?.data?.humidity,
          0,
          100
        );
        series[label].temperature[i] = tVal;
        series[label].humidity[i] = hVal;
      }
    });

    const minIso = time[0] ?? "";
    const maxIso = time[time.length - 1] ?? "";

    const names = sensors.map((s) => s.deviceName || s.name || (s as any).devEUI || "Sensor");

    return { time, series, minIso, maxIso, names };
  }, [sensors, historyData]);

  // ===== 2) Construye data re-muestreada con número EXACTO de puntos =====
  const [binnedData, setBinnedData] = useState<Record<string, any>[]>([]);
  const [sensorNames, setSensorNames] = useState<string[]>([]);
  const [inputMin, setInputMin] = useState<string>("");
  const [inputMax, setInputMax] = useState<string>("");

  type Point = { t: number; temp: number | null; hum: number | null };

  const buildBinnedData = (
    startMs: number,
    endMs: number,
    divisions: number
  ): { rows: Record<string, any>[] } => {
    const names = sensorNames.length ? sensorNames : unified.names;
    const step = (endMs - startMs) / divisions;
    const rows: Record<string, any>[] = [];

    const hasRaw = unified.time.length > 0;

    const sensorPoints: Record<string, Point[]> = {};
    names.forEach((name) => (sensorPoints[name] = []));

    if (hasRaw) {
      const nameList = Object.keys(unified.series).length ? Object.keys(unified.series) : names;
      unified.time.forEach((iso, idx) => {
        const t = toSafeDate(iso).getTime();
        nameList.forEach((name) => {
          const s = unified.series[name];
          if (!s) return;
          const temp = s.temperature[idx];
          const hum = s.humidity[idx];
          if (temp == null && hum == null) return;
          sensorPoints[name] ??= [];
          sensorPoints[name].push({ t, temp, hum });
        });
      });
    }

    for (let b = 0; b < divisions; b++) {
      const bStart = startMs + b * step;
      const bEnd = b === divisions - 1 ? endMs : startMs + (b + 1) * step;
      const tsMid = new Date(bStart + (bEnd - bStart) / 2).toISOString();

      const row: Record<string, any> = { ts: tsMid };

      names.forEach((name) => {
        if (!hasRaw || !sensorPoints[name]?.length) {
          row[`${name} °C`] = null;
          row[`${name} %RH`] = null;
          return;
        }
        let sumT = 0,
          cntT = 0;
        let sumH = 0,
          cntH = 0;
        for (const p of sensorPoints[name]) {
          if (p.t >= bStart && p.t < bEnd) {
            if (typeof p.temp === "number") {
              sumT += p.temp;
              cntT++;
            }
            if (typeof p.hum === "number") {
              sumH += p.hum;
              cntH++;
            }
          }
        }
        row[`${name} °C`] = cntT ? sumT / cntT : null;
        row[`${name} %RH`] = cntH ? sumH / cntH : null;
      });

      rows.push(row);
    }

    return { rows };
  };

  // Inicializa: 7d → 56 puntos
  useEffect(() => {
    setInputMin(unified.minIso ? unified.minIso.slice(0, 16) : "");
    setInputMax(unified.maxIso ? unified.maxIso.slice(0, 16) : "");

    const now = Date.now();
    const from = now - 7 * 24 * 3_600_000;

    setSensorNames(unified.names);

    const { rows } = buildBinnedData(from, now, PRESET_DIVISIONS["7d"]);
    setBinnedData(rows);
    setBrushRange({ startIndex: 0, endIndex: Math.max(0, rows.length - 1) });
    setBrushKey((k) => k + 1);
    setRangeType("7d");
    setRangeError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unified.names.join(","), unified.minIso, unified.maxIso]);

  // ===== 3) Quick ranges EXACTOS (48 / 56 / 60) =====
  const applyQuickRange = (rt: RangeType) => {
    setRangeType(rt);
    setRangeError("");

    const now = Date.now();

    if (rt === "all") {
      const hasData = !!unified.minIso && !!unified.maxIso;
      const startMs = hasData ? toSafeDate(unified.minIso).getTime() : now - 30 * 24 * 3_600_000;
      const endMs = hasData ? toSafeDate(unified.maxIso).getTime() : now;
      const dur = endMs - startMs;
      const divisions = dur <= 24 * 3_600_000 ? 48 : dur <= 7 * 24 * 3_600_000 ? 56 : 60;

      const { rows } = buildBinnedData(startMs, endMs, divisions);
      setBinnedData(rows);
      setBrushRange({ startIndex: 0, endIndex: Math.max(0, rows.length - 1) });
      setBrushKey((k) => k + 1);
      return;
    }

    if (rt === "custom") return;

    const hours = rt === "24h" ? 24 : rt === "7d" ? 7 * 24 : 30 * 24;
    const divisions = PRESET_DIVISIONS[rt]; // 👈 definición explícita
    const startMs = now - hours * 3_600_000;
    const endMs = now;

    const { rows } = buildBinnedData(startMs, endMs, divisions);
    setBinnedData(rows);
    setBrushRange({ startIndex: 0, endIndex: Math.max(0, rows.length - 1) });
    setBrushKey((k) => k + 1);
  };

  // ===== 4) Custom range (≤24h→48, ≤7d→56, >7d→60) =====
  const applyCustomRange = () => {
    setRangeError("");

    if (!customStart || !customEnd) {
      setRangeError("Completa ambas fechas.");
      return;
    }

    const startMs = toSafeDate(customStart).getTime();
    const endMs = toSafeDate(customEnd).getTime();
    if (!(endMs > startMs)) {
      setRangeError("El rango es inválido (fin debe ser > inicio).");
      return;
    }

    const dur = endMs - startMs;
    const divisions = dur <= 24 * 3_600_000 ? 48 : dur <= 7 * 24 * 3_600_000 ? 56 : 60;

    const { rows } = buildBinnedData(startMs, endMs, divisions);
    setBinnedData(rows);
    setBrushRange({ startIndex: 0, endIndex: Math.max(0, rows.length - 1) });
    setBrushKey((k) => k + 1);
  };

  // ===== 5) Tooltip =====
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active) return null;
    const ts = typeof label === "string" ? new Date(label) : null;
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg px-3 py-2 rounded-lg text-sm text-gray-700 max-w-[280px]">
        {ts && (
          <p className="font-semibold text-gray-900 mb-1">
            {ts.toLocaleString("es-DO", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
        <div className="space-y-0.5">
          {(payload ?? []).map((p: any, i: number) => {
            const name: string = p?.name ?? "";
            const v = typeof p?.value === "number" ? p.value : null;
            if (v == null) return null;
            const isTemp = name.endsWith("°C");
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded" style={{ background: p.color }} />
                <span className="text-gray-600">{name}:</span>
                <span className="font-semibold text-gray-900">
                  {v.toFixed(1)} {isTemp ? "°C" : "%"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ===== 6) Reset =====
  const resetBrush = () => {
    setBrushRange({ startIndex: 0, endIndex: Math.max(0, binnedData.length - 1) });
    setBrushKey((k) => k + 1);
    setRangeError("");
  };

  const customEnabled = rangeType === "custom";

  // ==== Calcula “esperado” para el badge de verificación ====
  const expectedPoints =
    rangeType === "24h"
      ? PRESET_DIVISIONS["24h"]
      : rangeType === "7d"
      ? PRESET_DIVISIONS["7d"]
      : rangeType === "30d"
      ? PRESET_DIVISIONS["30d"]
      : rangeType === "custom"
      ? (() => {
          if (!customStart || !customEnd) return 0;
          const dur = toSafeDate(customEnd).getTime() - toSafeDate(customStart).getTime();
          return dur <= 24 * 3_600_000 ? 48 : dur <= 7 * 24 * 3_600_000 ? 56 : 60;
        })()
      : binnedData.length; // "all" → depende del rango total

  return (
    <div className="w-full min-w-0">
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
          onClick={resetBrush}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          <ArrowPathIcon className="w-4 h-4" /> Reset vista
        </button>

        {/* Quick ranges */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 ml-auto">
          {(["24h", "7d", "30d", "all", "custom"] as RangeType[]).map((opt) => (
            <button
              key={opt}
              onClick={() => applyQuickRange(opt)}
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
                : opt === "all"
                ? "Todo"
                : "Personalizado"}
            </button>
          ))}

          {/* Badge de verificación de puntos */}
          <span className="ml-1 px-2 py-1 rounded-full text-[11px] sm:text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">
            Puntos: {binnedData.length}
            {expectedPoints ? ` / ${expectedPoints}` : ""}
          </span>
        </div>
      </div>

      {/* Custom range */}
      <div className="flex flex-wrap items-end gap-2 sm:gap-3 mb-3">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Desde</label>
          <input
            type="datetime-local"
            value={customStart}
            min={inputMin || undefined}
            max={inputMax || undefined}
            onChange={(e) => setCustomStart(e.target.value)}
            disabled={!customEnabled}
            className={`border rounded-md px-2 py-1 text-xs sm:text-sm text-gray-700 focus:ring-2 focus:ring-blue-400 ${
              !customEnabled ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Hasta</label>
          <input
            type="datetime-local"
            value={customEnd}
            min={inputMin || undefined}
            max={inputMax || undefined}
            onChange={(e) => setCustomEnd(e.target.value)}
            disabled={!customEnabled}
            className={`border rounded-md px-2 py-1 text-xs sm:text-sm text-gray-700 focus:ring-2 focus:ring-blue-400 ${
              !customEnabled ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
          />
        </div>
        <button
          onClick={applyCustomRange}
          disabled={!customEnabled}
          className={`h-[34px] sm:h-[38px] px-3 py-1.5 rounded-md text-xs sm:text-sm ${
            customEnabled
              ? "bg-gray-900 text-white hover:bg-black"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Aplicar rango
        </button>
        {rangeError && (
          <span className="text-[11px] sm:text-xs text-red-600">{rangeError}</span>
        )}
      </div>

      {/* Gráfico */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 sm:p-4 md:p-6">
        <div className="w-full h-[360px] sm:h-[420px] md:h-[480px] lg:h-[520px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={binnedData} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis
                dataKey="ts"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                minTickGap={24}
                tickFormatter={(v: string) => fmtTick(v)}
              />

              {/* Ejes */}
              <YAxis
                yAxisId="temp"
                domain={[-40, 110]}
                tick={{ fontSize: 11, fill: "#1f2937" }}
                tickFormatter={(v) => `${v}°C`}
                width={48}
              />
              <YAxis
                yAxisId="hum"
                orientation="left"
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#065f46" }}
                tickFormatter={(v) => `${v}%`}
                width={48}
                mirror
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} iconType="circle" />

              {/* Bandas sugeridas */}
              <ReferenceArea yAxisId="temp" y1={24} y2={30} fill="#EFF6FF" fillOpacity={0.35} />
              <ReferenceArea yAxisId="hum" y1={40} y2={60} fill="#ECFDF5" fillOpacity={0.25} />

              {/* Series */}
              {(sensorNames.length ? sensorNames : unified.names).map((name, idx) => {
                const c = colorOf(idx, 1);
                return (
                  <React.Fragment key={name}>
                    {showTemp && (
                      <Line
                        type="monotone"
                        yAxisId="temp"
                        dataKey={`${name} °C`}
                        name={`${name} °C`}
                        stroke={c}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive
                        animationDuration={600}
                        connectNulls
                      />
                    )}
                    {showHum && (
                      <Line
                        type="monotone"
                        yAxisId="hum"
                        dataKey={`${name} %RH`}
                        name={`${name} %RH`}
                        stroke={c}
                        strokeDasharray="6 4"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive
                        animationDuration={600}
                        connectNulls
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {/* Brush cubre todo el rango */}
              <Brush
                key={brushKey}
                dataKey="ts"
                travellerWidth={8}
                height={28}
                startIndex={brushRange.startIndex}
                endIndex={brushRange.endIndex}
                onChange={(r: { startIndex?: number; endIndex?: number } | null) =>
                  setBrushRange(r ?? {})
                }
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString("es-DO", { day: "2-digit", month: "short" })
                }
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MultiSensorTimelineRecharts;
