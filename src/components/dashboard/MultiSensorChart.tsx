/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-empty */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  Brush,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { WeatherContext } from "../../context/WeatherContext";
import type { Measure } from "../../types/types";
import { CloudIcon, FireIcon, ArrowPathIcon } from "@heroicons/react/24/solid";

/* =========================================
   Tipos / Helpers
========================================= */

type Quick = "12h" | "24h" | "72h" | "7d" | "30d" | "all" | "custom";

const PRESET_DIVISIONS: Record<Exclude<Quick, "all" | "custom">, number> = {
  "12h": 144, // ~5 min
  "24h": 144, // ~10 min
  "72h": 288, // ~15 min
  "7d": 504,
  "30d": 1440,
};

type ChartRow = { ts: string; [key: string]: number | string | null };

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

const nowMinus10m = () => Date.now() - 10 * 60 * 1000;
const adjustEndForNow = (endMs: number) => Math.min(endMs, nowMinus10m());

const dayBoundsMs = (d: Date) => {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
  return { start, end };
};

const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOfDayLocal = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
};

const endOfDayLocal = (ymd: string) => {
  const dt = startOfDayLocal(ymd);
  dt.setHours(23, 59, 59, 999);
  return dt;
};

const clampIsoToBounds = (iso: string, minIso: string, maxIso: string): string => {
  const t = toSafeDate(iso).getTime();
  const tMin = toSafeDate(minIso).getTime();
  const tMax = toSafeDate(maxIso).getTime();
  const clamped = Math.min(Math.max(t, tMin), tMax);
  return new Date(clamped).toISOString();
};

const sliceToMinute = (iso?: string) => (iso ? iso.slice(0, 16) : "");

/* =========================================
   Componente
========================================= */

const MultiSensorTimelineRecharts: React.FC = () => {
  const {
    sensors,
    historyData,
    fetchHistoryRange,
    refreshData,
    isRangeLoading,
  } = useContext(WeatherContext) as any;

  const sensorsReady = Array.isArray(sensors) && sensors.length > 0;

  // -------- Controles de rango --------
  const today = new Date();
  const todayStr = toYMD(today);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 3600 * 1000);
  const weekAgoStr = toYMD(weekAgo);

  const [quick, setQuick] = useState<Quick>("7d");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: weekAgoStr,
    end: todayStr,
  });

  useEffect(() => {
    void refreshData?.(true);
  }, []);

  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [rangeError, setRangeError] = useState<string>("");

  // -------- Colores estables por sensor --------
  const colorMapRef = useRef<Record<string, string>>({});
  const colorOf = (name: string, idx: number, alpha = 1) => {
    if (!colorMapRef.current[name]) {
      const hue = (idx * 137.508) % 360;
      colorMapRef.current[name] = `hsla(${hue},70%,50%,1)`;
    }
    const base = colorMapRef.current[name];
    return base.replace(/,1\)$/, `,${Math.max(0, Math.min(1, alpha))})`);
  };

  // -------- Unificación de timeline --------
  const unified = useMemo(() => {
    const tsSet = new Set<string>();

    (sensors ?? []).forEach((s: any) => {
      const key = s?.devEUI ?? s?.name;
      const hist: Measure[] = (historyData?.[key] ?? []) as any[];
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

    const time = Array.from(tsSet).sort();
    const idxOf: Record<string, number> = {};
    time.forEach((iso, i) => (idxOf[iso] = i));

    const series: Record<string, { temperature: (number | null)[]; humidity: (number | null)[] }> =
      {};
    const labelOf = (s: any) => (s?.deviceName || s?.name || s?.devEUI || "Sensor") as string;

    (sensors ?? []).forEach((s: any) => {
      const key = s?.devEUI ?? s?.name;
      const label = String(labelOf(s)).trim() || "Sensor";
      const hist: Measure[] = (historyData?.[key] ?? []) as any[];

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
          (item as any)?.humedity ?? (item as any)?.humidity ?? (item as any)?.data?.humidity,
          0,
          100
        );
        series[label].temperature[i] = tVal;
        series[label].humidity[i] = hVal;
      }
    });

    const minIso = time[0] ?? "";
    const maxIso = time[time.length - 1] ?? "";

    const names: string[] = (sensors ?? [])
      .map((s: any) => (s?.deviceName || s?.name || s?.devEUI || "Sensor") as string)
      .map((n: any) => String(n).trim())
      .filter((n: string | any[]) => n.length > 0);

    return { time, series, minIso, maxIso, names };
  }, [sensors, historyData]);

  // -------- Ventana actual en ms --------
  const windowMs = useMemo(() => {
    if (quick === "custom" && customStart && customEnd) {
      const s = toSafeDate(customStart).getTime();
      const e = adjustEndForNow(toSafeDate(customEnd).getTime());
      return [s, e] as const;
    }

    if (quick === "all") {
      const has = !!unified.minIso && !!unified.maxIso;
      const endMs = adjustEndForNow(has ? toSafeDate(unified.maxIso).getTime() : Date.now());
      const startMs = has ? toSafeDate(unified.minIso).getTime() : endMs - 30 * 24 * 3600 * 1000;
      return [startMs, endMs] as const;
    }

    if (quick === "12h" || quick === "24h" || quick === "72h") {
      const hours = quick === "12h" ? 12 : quick === "24h" ? 24 : 72;
      const endMs = adjustEndForNow(Date.now());
      const startMs = endMs - hours * 3600 * 1000;
      return [startMs, endMs] as const;
    }

    // 7d / 30d — por días completos
    const s = startOfDayLocal(dateRange.start).getTime();
    const e = endOfDayLocal(dateRange.end).getTime();
    const { start: todayStart, end: todayEnd } = dayBoundsMs(new Date());
    const includesToday = e >= todayStart && s <= todayEnd;
    const endAdj = includesToday ? adjustEndForNow(e) : e;
    return [s, endAdj] as const;
  }, [quick, dateRange.start, dateRange.end, customStart, customEnd, unified.minIso, unified.maxIso]);

  const windowStartMs = windowMs[0];
  const windowEndMs = windowMs[1];

  // -------- Helpers para pedir rango (ISO) --------
  const computeRangeISO = (): { fromISO: string; toISO: string } => {
    let fromISO: string;
    let toISO: string;

    if (quick === "custom" && customStart && customEnd) {
      fromISO = toSafeDate(customStart).toISOString();
      toISO = toSafeDate(customEnd).toISOString();
    } else if (quick === "all") {
      const to = new Date();
      const from = new Date(to.getTime() - 90 * 24 * 3600 * 1000);
      fromISO = from.toISOString();
      toISO = to.toISOString();
    } else if (quick === "12h" || quick === "24h" || quick === "72h") {
      const hours = quick === "12h" ? 12 : quick === "24h" ? 24 : 72;
      const to = new Date();
      const from = new Date(to.getTime() - hours * 3600 * 1000);
      fromISO = from.toISOString();
      toISO = to.toISOString();
    } else {
      fromISO = startOfDayLocal(dateRange.start).toISOString();
      toISO = endOfDayLocal(dateRange.end).toISOString();
    }
    return { fromISO, toISO };
  };

  // -------- Re-muestreo a bins --------
  const [binnedData, setBinnedData] = useState<ChartRow[]>([]);
  const [rangeStartIso, setRangeStartIso] = useState<string>("");
  const [rangeEndIso, setRangeEndIso] = useState<string>("");
  const [brushKey, setBrushKey] = useState(0);
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({});

  type Point = { t: number; temp: number | null; hum: number | null };

  const ensureBoundaryRows = (
    rows: ChartRow[],
    startMs: number,
    endMs: number,
    names: string[]
  ) => {
    const first = rows[0]?.ts;
    const last = rows[rows.length - 1]?.ts;

    const needStart = !first || toSafeDate(first).getTime() !== startMs;
    const needEnd = !last || toSafeDate(last).getTime() !== endMs;

    const makeEmptyRow = (ms: number): ChartRow => {
      const r: ChartRow = { ts: new Date(ms).toISOString() };
      names.forEach((n) => {
        r[`${n} °C`] = null;
        r[`${n} %RH`] = null;
      });
      return r;
    };

    return [
      ...(needStart ? [makeEmptyRow(startMs)] : []),
      ...rows,
      ...(needEnd ? [makeEmptyRow(endMs)] : []),
    ];
  };

  const buildBinnedData = (
    startMs: number,
    endMs: number
  ): { rows: ChartRow[]; startIso: string; endIso: string } => {
    const names: string[] = unified.names;
    const dur = Math.max(1, endMs - startMs);
    const H = 3600 * 1000;

    let divisions: number;
    if (dur <= 12 * H) {
      divisions = PRESET_DIVISIONS["12h"];
    } else if (dur <= 24 * H) {
      divisions = PRESET_DIVISIONS["24h"];
    } else if (dur <= 72 * H) {
      divisions = PRESET_DIVISIONS["72h"];
    } else if (dur <= 7 * 24 * H) {
      divisions = PRESET_DIVISIONS["7d"];
    } else {
      divisions = PRESET_DIVISIONS["30d"];
    }

    const step = Math.max(1, Math.floor(dur / Math.max(1, divisions)));
    const rows: ChartRow[] = [];

    const hasRaw = unified.time.length > 0;
    const sensorPoints: Record<string, Point[]> = {};
    names.forEach((name: string) => (sensorPoints[name] = []));

    if (hasRaw) {
      const nameList: string[] = Object.keys(unified.series).length
        ? Object.keys(unified.series)
        : names;
      unified.time.forEach((iso, idx) => {
        const t = toSafeDate(iso).getTime();
        if (t < startMs || t > endMs) return;
        nameList.forEach((name: string) => {
          const s = unified.series[name];
          if (!s) return;
          const temp = s.temperature[idx];
          const hum = s.humidity[idx];
          if (temp == null && hum == null) return;
          (sensorPoints[name] ??= []).push({ t, temp, hum });
        });
      });
    }

    for (let t0 = startMs; t0 < endMs; t0 += step) {
      const bStart = t0;
      const bEnd = Math.min(endMs, t0 + step);
      const tsMid = new Date(bStart + (bEnd - bStart) / 2).toISOString();

      const row: ChartRow = { ts: tsMid };

      names.forEach((name: string) => {
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

    const startIso = new Date(startMs).toISOString();
    const endIso = new Date(endMs).toISOString();
    const withBounds = ensureBoundaryRows(rows, startMs, endMs, names);
    return { rows: withBounds, startIso, endIso };
  };

  // -------- Pedir histórico --------
  useEffect(() => {
    if (!sensorsReady) return;
    const { fromISO, toISO } = computeRangeISO();
    const load = async () => {
      try {
        await fetchHistoryRange?.({ from: fromISO, to: toISO, pageSize: 500, maxPages: 50 });
      } catch {}
    };
    load();
  }, [sensorsReady, quick, dateRange.start, dateRange.end, customStart, customEnd, fetchHistoryRange]);

  // -------- Recalcular líneas --------
  useEffect(() => {
    if (!Number.isFinite(windowStartMs) || !Number.isFinite(windowEndMs) || windowEndMs <= windowStartMs) {
      setBinnedData([]);
      setBrushRange({});
      return;
    }
    const { rows, startIso, endIso } = buildBinnedData(windowStartMs, windowEndMs);
    setBinnedData(rows);
    setRangeStartIso(startIso);
    setRangeEndIso(endIso);
    const endIdx = Math.max(0, rows.length - 1);
    setBrushRange({ startIndex: 0, endIndex: endIdx });
    setBrushKey((k) => k + 1);
  }, [windowStartMs, windowEndMs, unified.time]);

  // -------- Autorefresco cada 10 min si incluye hoy --------
  useEffect(() => {
    const { start: tS, end: tE } = dayBoundsMs(new Date());
    const includesToday = windowEndMs >= tS && windowStartMs <= tE;
    if (!includesToday) return;

    const tick = async () => {
      try {
        await refreshData?.();
        const { fromISO, toISO } = computeRangeISO();
        await fetchHistoryRange?.({ from: fromISO, to: toISO, pageSize: 500, maxPages: 50 });
        const { rows, startIso, endIso } = buildBinnedData(windowStartMs, adjustEndForNow(Date.now()));
        setBinnedData(rows);
        setRangeStartIso(startIso);
        setRangeEndIso(endIso);
        setBrushRange({ startIndex: 0, endIndex: Math.max(0, rows.length - 1) });
        setBrushKey((k) => k + 1);
      } catch {}
    };

    const bucket = 10 * 60 * 1000;
    const id = window.setInterval(tick, bucket);
    return () => window.clearInterval(id);
  }, [windowStartMs, windowEndMs, refreshData, fetchHistoryRange, quick, dateRange.start, dateRange.end, customStart, customEnd]);

  // -------- UI: acciones de rango --------
  const applyQuick = (k: Quick) => {
    setRangeError("");

    if (k === "12h" || k === "24h" || k === "72h") {
      setQuick(k);
      return;
    }

    if (k === "7d") {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
      setDateRange({ start: toYMD(start), end: toYMD(end) });
      setQuick("7d");
    } else if (k === "30d") {
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000);
      setDateRange({ start: toYMD(start), end: toYMD(end) });
      setQuick("30d");
    } else if (k === "all") {
      setQuick("all");
    } else {
      setQuick("custom");
    }
  };

  const applyCustomFromInputs = () => {
    setRangeError("");
    if (!customStart || !customEnd) {
      setRangeError("Completa ambas fechas y horas.");
      return;
    }
    const s = toSafeDate(customStart);
    const e = toSafeDate(customEnd);
    if (!(e.getTime() > s.getTime())) {
      setRangeError("El rango es inválido (fin debe ser > inicio).");
      return;
    }
    setQuick("custom");
  };

  // -------- Toggles globales (Temp / Hum) --------
  const [showTemp, setShowTemp] = useState(true);
  const [showHum, setShowHum] = useState(true);

  // -------- Toggles por serie (por sensor / métrica) --------
  type MetricKey = string; // `${name} °C` o `${name} %RH`
  const [hiddenSeries, setHiddenSeries] = useState<Record<MetricKey, boolean>>({});

  const toggleSeries = useCallback((key: MetricKey) => {
    setHiddenSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const isSeriesVisible = (key: MetricKey) => !hiddenSeries[key];

  // Items para la leyenda interactiva
  const legendItems = useMemo(() => {
    const items: { id: MetricKey; color: string; label: string; kind: "temp" | "hum" }[] = [];
    unified.names.forEach((name, idx) => {
      const c = colorOf(name, idx, 1);
      if (showTemp) {
        items.push({
          id: `${name} °C`,
          color: c,
          label: `${name} °C`,
          kind: "temp",
        });
      }
      if (showHum) {
        items.push({
          id: `${name} %RH`,
          color: c,
          label: `${name} %RH`,
          kind: "hum",
        });
      }
    });
    return items;
  }, [unified.names, showTemp, showHum]);

  const resetBrush = () => {
    const endIdx = Math.max(0, binnedData.length - 1);
    setBrushRange({ startIndex: 0, endIndex: endIdx });
    setBrushKey((k) => k + 1);
    setRangeError("");
  };

  /* ================================
     DETECCIÓN DE HUECOS (≥ 60 min)
  ================================= */
  const GAP_MINUTES = 60;
  const GAP_MS = GAP_MINUTES * 60 * 1000;

  type GapSpan = { startIso: string; endIso: string; durationMin: number };

  const [noDataSpans, setNoDataSpans] = useState<GapSpan[]>([]);

  const recomputeNoDataSpans = useCallback(() => {
    const rawTimes = unified.time
      .map((iso) => toSafeDate(iso).getTime())
      .filter((t) => t >= windowStartMs && t <= windowEndMs)
      .sort((a, b) => a - b);

    const spans: GapSpan[] = [];

    if (rawTimes.length === 0) {
      if (windowEndMs - windowStartMs >= GAP_MS) {
        spans.push({
          startIso: new Date(windowStartMs).toISOString(),
          endIso: new Date(windowEndMs).toISOString(),
          durationMin: Math.round((windowEndMs - windowStartMs) / 60000),
        });
      }
      setNoDataSpans(spans);
      return;
    }

    // Segmento inicial
    if (rawTimes[0] - windowStartMs >= GAP_MS) {
      spans.push({
        startIso: new Date(windowStartMs).toISOString(),
        endIso: new Date(rawTimes[0]).toISOString(),
        durationMin: Math.round((rawTimes[0] - windowStartMs) / 60000),
      });
    }

    // Segmentos intermedios
    for (let i = 1; i < rawTimes.length; i++) {
      const prev = rawTimes[i - 1];
      const t = rawTimes[i];
      if (t - prev >= GAP_MS) {
        spans.push({
          startIso: new Date(prev).toISOString(),
          endIso: new Date(t).toISOString(),
          durationMin: Math.round((t - prev) / 60000),
        });
      }
    }

    // Segmento final
    const last = rawTimes[rawTimes.length - 1];
    if (windowEndMs - last >= GAP_MS) {
      spans.push({
        startIso: new Date(last).toISOString(),
        endIso: new Date(windowEndMs).toISOString(),
        durationMin: Math.round((windowEndMs - last) / 60000),
      });
    }

    setNoDataSpans(spans);
  }, [windowStartMs, windowEndMs, unified.time]);

  useEffect(() => {
    recomputeNoDataSpans();
  }, [recomputeNoDataSpans]);

  const isInGap = (iso: string) => {
    const t = toSafeDate(iso).getTime();
    return noDataSpans.some(
      (g) => toSafeDate(g.startIso).getTime() <= t && t <= toSafeDate(g.endIso).getTime()
    );
  };

  const worstGapMin = noDataSpans.length
    ? Math.max(...noDataSpans.map((g) => g.durationMin))
    : 0;

  // -------- Estados derivados de datos --------
  const hasRawInWindow = useMemo(() => {
    if (!unified.time.length) return false;
    return unified.time.some((iso) => {
      const t = toSafeDate(iso).getTime();
      return t >= windowStartMs && t <= windowEndMs;
    });
  }, [unified.time, windowStartMs, windowEndMs]);

  const hasNumericBinned = useMemo(() => {
    if (!binnedData.length || !unified.names.length) return false;
    const metricKeys = unified.names.flatMap((n) => [`${n} °C`, `${n} %RH`]);
    return binnedData.some((row) =>
      metricKeys.some((key) => typeof row[key] === "number")
    );
  }, [binnedData, unified.names]);

  const showNoDataOverlay =
    sensorsReady && !isRangeLoading && (!hasRawInWindow || !hasNumericBinned);

  return (
    <div className="w-full min-w-0">
      {/* Controles superiores */}
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
          {(["12h", "24h", "72h", "7d", "30d", "all", "custom"] as Quick[]).map((opt) => (
            <button
              key={opt}
              onClick={() => applyQuick(opt)}
              className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs rounded-full font-medium border transition ${
                quick === opt
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
              }`}
            >
              {opt === "12h"
                ? "12 horas"
                : opt === "24h"
                ? "24 horas"
                : opt === "72h"
                ? "72 horas"
                : opt === "7d"
                ? "7 días"
                : opt === "30d"
                ? "30 días"
                : opt === "all"
                ? "Todo"
                : "Personalizado"}
            </button>
          ))}

          <span className="ml-1 px-2 py-1 rounded-full text-[11px] sm:text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">
            Puntos: {binnedData.length}
          </span>

          <span
            className={`ml-1 px-2 py-1 rounded-full text-[11px] sm:text-xs border ${
              noDataSpans.length
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
            title={
              noDataSpans.length
                ? `Mayores huecos sin reporte: ${worstGapMin} min`
                : "Sin huecos ≥ 60 min"
            }
          >
            {noDataSpans.length ? `Huecos: ${noDataSpans.length}` : "Sin huecos ≥60m"}
          </span>
        </div>
      </div>

      {/* Controles custom */}
      <div className="mb-3">
        <div className="relative">
          <div className="min-h-[48px] sm:min-h-[56px]" />
          <div
            aria-hidden={quick !== "custom"}
            className={[
              "absolute inset-0 flex flex-wrap items-end gap-2 sm:gap-3",
              "transition-all duration-300 ease-out",
              quick === "custom"
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-1 pointer-events-none",
            ].join(" ")}
          >
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Desde</label>
              <input
                type="datetime-local"
                value={customStart}
                onChange={(e) => {
                  const minIso =
                    unified.minIso || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
                  const maxIso = unified.maxIso || new Date().toISOString();
                  const clamped = clampIsoToBounds(e.target.value, minIso, maxIso);
                  setCustomStart(sliceToMinute(clamped));
                  setRangeError("");
                }}
                className="border rounded-md px-2 py-1 text-xs sm:text-sm text-gray-700 focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Hasta</label>
              <input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => {
                  const minIso =
                    unified.minIso || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
                  const maxIso = unified.maxIso || new Date().toISOString();
                  const clamped = clampIsoToBounds(e.target.value, minIso, maxIso);
                  setCustomEnd(sliceToMinute(clamped));
                  setRangeError("");
                }}
                className="border rounded-md px-2 py-1 text-xs sm:text-sm text-gray-700 focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              onClick={applyCustomFromInputs}
              className="h-[34px] sm:h-[38px] px-3 py-1.5 rounded-md text-xs sm:text-sm bg-gray-900 text-white hover:bg-black"
            >
              Aplicar rango
            </button>
            {rangeError && (
              <span className="text-[11px] sm:text-xs text-red-600">{rangeError}</span>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 sm:p-4 md:p-6">
        {isRangeLoading && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs border-blue-200 bg-blue-50 text-blue-700">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            Cargando rango…
          </div>
        )}

        <div
          className="relative w-full h-[360px] sm:h-[420px] md:h-[480px] lg:h-[520px] min-w-0"
          aria-busy={isRangeLoading}
          aria-live="polite"
        >
          {/* Overlay de carga */}
          <div
            className={[
              "absolute inset-0 z-[1] transition-opacity duration-200 pointer-events-none",
              isRangeLoading ? "opacity-100" : "opacity-0",
            ].join(" ")}
            style={{
              backdropFilter: isRangeLoading ? "blur(2px)" : "none",
              WebkitBackdropFilter: isRangeLoading ? "blur(2px)" : "none",
              background: isRangeLoading ? "rgba(255,255,255,0.35)" : "transparent",
              borderRadius: "1rem",
            }}
          />

          {isRangeLoading && (
            <div className="absolute inset-0 z-[2] flex items-center justify-center">
              <div className="flex items-center gap-3 px-3 py-2 rounded-full bg-white/85 border border-gray-200 shadow-sm text-sm text-gray-700">
                <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-600" />
                Trayendo datos…
              </div>
            </div>
          )}

          {/* Overlay cuando NO hay datos en el periodo */}
          {showNoDataOverlay && (
            <div className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none">
              <div className="px-4 py-3 rounded-xl bg-white/95 border border-dashed border-gray-300 shadow-sm text-center max-w-xs">
                <p className="text-sm font-medium text-gray-900">Sin datos en este periodo</p>
                <p className="mt-1 text-xs text-gray-500">
                  No se encontraron mediciones de sensores para el rango seleccionado.
                  Prueba con otro rango de fechas u horas.
                </p>
              </div>
            </div>
          )}

          <div
            className={[
              "relative z-0 h-full transition",
              isRangeLoading ? "pointer-events-none select-none" : "",
            ].join(" ")}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={binnedData} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis
                  dataKey="ts"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  minTickGap={24}
                  tickFormatter={(v: string) => fmtTick(v)}
                />
                <YAxis
                  yAxisId="temp"
                  domain={[-40, 110]}
                  tick={{ fontSize: 11, fill: "#1f2937" }}
                  tickFormatter={(v) => `${v}°C`}
                  width={48}
                />
                <YAxis
                  yAxisId="hum"
                  orientation="right"
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#065f46" }}
                  tickFormatter={(v) => `${v}%`}
                  width={48}
                />

                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active) return null;
                    const ts = typeof label === "string" ? new Date(label) : null;
                    const gap = typeof label === "string" && isInGap(label);

                    const rows = (payload ?? []).filter(
                      (p: any) => typeof p?.value === "number"
                    );
                    const hasValues = rows.length > 0;
                    const noDataAtPoint = !gap && !hasValues;

                    const showWholeRangeNoData = noDataAtPoint && !hasRawInWindow;

                    return (
                      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg px-3 py-2 rounded-lg text-sm text-gray-700 max-w-[300px]">
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

                        {/* Mensaje para huecos largos */}
                        {gap && (
                          <div className="mb-2 px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs">
                            Sin reportes de sensores en este periodo (≥ {GAP_MINUTES} min).
                          </div>
                        )}

                        {/* Mensaje cuando no hay datos en el bin */}
                        {noDataAtPoint && !showWholeRangeNoData && (
                          <div className="mb-2 px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs">
                            No hay datos reportados por los sensores en este intervalo.
                          </div>
                        )}

                        {/* Mensaje cuando no hay datos en TODO el periodo */}
                        {showWholeRangeNoData && (
                          <div className="mb-2 px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs">
                            No se encontraron datos de sensores en todo el periodo seleccionado.
                            Ajusta el rango para ver mediciones disponibles.
                          </div>
                        )}

                        <div className="space-y-0.5">
                          {hasValues &&
                            rows.map((p: any, i: number) => {
                              const name: string = p?.name ?? "";
                              const v = typeof p?.value === "number" ? p.value : null;
                              if (v == null) return null;
                              const isTemp = name.endsWith("°C");
                              return (
                                <div key={i} className="flex items-center gap-2">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded"
                                    style={{ background: p.color }}
                                  />
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
                  }}
                />

                {/* Bandas recomendadas */}
                <ReferenceArea yAxisId="temp" y1={24} y2={30} fill="#EFF6FF" fillOpacity={0.35} />
                <ReferenceArea yAxisId="hum" y1={40} y2={60} fill="#ECFDF5" fillOpacity={0.25} />

                {/* Bandas de NO DATA (x1/x2) */}
                {noDataSpans.map((g, i) => (
                  <ReferenceArea
                    key={`gap-${i}`}
                    x1={g.startIso}
                    x2={g.endIso}
                    fill="#6B7280"
                    fillOpacity={0.12}
                    strokeOpacity={0}
                  />
                ))}

                {/* Líneas de referencia inicio/fin */}
                {rangeStartIso && (
                  <ReferenceLine x={rangeStartIso} stroke="#9CA3AF" strokeDasharray="3 3" />
                )}
                {rangeEndIso && (
                  <ReferenceLine x={rangeEndIso} stroke="#9CA3AF" strokeDasharray="3 3" />
                )}

                {/* Series por sensor / métrica */}
                {unified.names.map((name, idx) => {
                  const c = colorOf(name, idx, 1);
                  const tempKey: MetricKey = `${name} °C`;
                  const humKey: MetricKey = `${name} %RH`;
                  return (
                    <React.Fragment key={name}>
                      {showTemp && isSeriesVisible(tempKey) && (
                        <Line
                          type="monotone"
                          yAxisId="temp"
                          dataKey={tempKey}
                          name={tempKey}
                          stroke={c}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive
                          animationDuration={600}
                          connectNulls={false}
                        />
                      )}
                      {showHum && isSeriesVisible(humKey) && (
                        <Line
                          type="monotone"
                          yAxisId="hum"
                          dataKey={humKey}
                          name={humKey}
                          stroke={c}
                          strokeDasharray="6 4"
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive
                          animationDuration={600}
                          connectNulls={false}
                        />
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Brush */}
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
                    new Date(v).toLocaleDateString("es-DO", {
                      day: "2-digit",
                      month: "short",
                    })
                  }
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leyenda interactiva abajo */}
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs">
            {legendItems.map((item) => {
              const disabled = hiddenSeries[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => toggleSeries(item.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] sm:text-xs transition ${
                    disabled
                      ? "bg-gray-50 text-gray-400 border-gray-200 line-through"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{
                      background: disabled ? "#e5e7eb" : item.color,
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  />
                  <span className="truncate max-w-[120px] sm:max-w-[160px]">{item.label}</span>
                  {disabled && <span className="text-[10px] text-gray-400">oculto</span>}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-gray-500">
            <span
              className="inline-block align-middle w-3 h-3 rounded-sm mr-1"
              style={{ background: "rgba(107,114,128,0.12)" }}
            />
            Bandas grises = periodos sin reporte (≥ {GAP_MINUTES} min)
            {noDataSpans.length ? ` · Mayor hueco: ${worstGapMin} min` : ""}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiSensorTimelineRecharts;
