/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useMemo, useState, useContext } from "react";
import type { Room } from "../../types/types";
import { Wifi, WifiOff, Thermometer, Droplet, Battery, Clock, Search } from "lucide-react";
import { SensorsContext } from "../../context/SensorsContext";
import { WeatherContext } from "../../context/WeatherContext";

/* =========================
   Tipos / Props
========================= */
type SortKey = "status" | "updated" | "name" | "temp" | "hum";
type SortDir = "asc" | "desc";
type Range = { min?: number; max?: number };
type Thresholds = { temperature?: Range; humidity?: Range; tolerance?: number };

interface SensorCardsProps {
  rooms: Room[];
  loading?: boolean;
  liveWindowMin?: number; // se mantiene para UI/prop, pero conexión real usa getSmartConnection
  showControls?: boolean;
  onCardClick?: (room: Room) => void;
  thresholds?: Thresholds;
  className?: string;
}

/* =========================
   Utils
========================= */
const clampNum = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const coerceDate = (v: any): Date | null => {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    const ms = v < 9_999_999_999 ? v * 1000 : v;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const s = v.includes(" ") ? v.replace(" ", "T") : v;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  if (!v && v !== 0) return null;
  const d = new Date(v as any);
  return isNaN(d.getTime()) ? null : d;
};

const formatAbs = (d: Date | null) =>
  d
    ? d.toLocaleString("es-DO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

const formatRel = (from: Date | null) => {
  if (!from) return "";
  const min = (Date.now() - from.getTime()) / 60000;
  if (min < 1) return "hace <1 min";
  if (min < 60) return `hace ${Math.floor(min)} min`;
  const h = min / 60;
  if (h < 24) return `hace ${Math.floor(h)} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
};

const ellipsize = (s: string, max = 42) => (s?.length > max ? s.slice(0, max - 1) + "…" : s);

const toneFor = (value: number | null, range?: Range, tol = 2) => {
  if (value == null || !Number.isFinite(value)) return { text: "text-gray-900", chip: "bg-gray-50 border-gray-200" };
  if (!range?.min && !range?.max) return { text: "text-gray-900", chip: "bg-gray-50 border-gray-200" };

  const { min, max } = range;
  const near = (edge: number | undefined, v: number) => (edge == null ? false : Math.abs(v - edge) <= tol);

  const outBelow = min != null && value < min;
  const outAbove = max != null && value > max;

  if (!outBelow && !outAbove) return { text: "text-emerald-700", chip: "bg-emerald-50 border-emerald-200" };
  if ((outBelow && near(min, value)) || (outAbove && near(max, value)))
    return { text: "text-amber-700", chip: "bg-amber-50 border-amber-200" };
  return { text: "text-rose-700", chip: "bg-rose-50 border-rose-200" };
};

const headerAccent = (isConnected: boolean, temp: number | null, hum: number | null, th?: Thresholds) => {
  if (!isConnected) return "bg-gray-200";
  const t = toneFor(temp, th?.temperature, th?.tolerance ?? 2).chip;
  const h = toneFor(hum, th?.humidity, th?.tolerance ?? 2).chip;
  const rank = (chip: string) => (chip.includes("rose") ? 3 : chip.includes("amber") ? 2 : chip.includes("emerald") ? 1 : 0);
  const worst = rank(t) >= rank(h) ? t : h;

  if (worst.includes("rose")) return "bg-gradient-to-r from-rose-500/80 to-rose-400/70";
  if (worst.includes("amber")) return "bg-gradient-to-r from-amber-500/80 to-amber-400/70";
  if (worst.includes("emerald")) return "bg-gradient-to-r from-emerald-500/80 to-emerald-400/70";
  return "bg-gray-300";
};

/* =========================
   Resolución de histórico (idéntico al dashboard)
========================= */
type HistoryDict = Record<string, any[]>;

const buildLooseIndex = (historyData: HistoryDict) => {
  const index = new Map<string, string>();
  for (const k of Object.keys(historyData || {})) {
    index.set(String(k).toLowerCase(), k);
  }
  return index;
};

const pickHistory = (sensor: any, historyData: HistoryDict, looseIndex: Map<string, string>) => {
  const cands = [sensor?.devEUI, sensor?.name, sensor?.deviceName]
    .map((x) => (x == null ? "" : String(x)))
    .filter(Boolean);
  for (const k of cands) if (historyData[k]) return historyData[k];
  for (const k of cands) {
    const real = looseIndex.get(k.toLowerCase());
    if (real && historyData[real]) return historyData[real];
  }
  return [];
};

/* =========================
   Tarjeta
========================= */
const SensorCard: React.FC<{
  room: Room;
  isConnected: boolean;
  lastSeen: Date | null;
  thresholds?: Thresholds;
  onClick?: (room: Room) => void;
}> = ({ room, isConnected, lastSeen, thresholds, onClick }) => {
  const name = (room as any).deviceName || room.name || "Sensor";

  const temp = clampNum((room as any).temperature);
  const hum = clampNum((room as any).humedity ?? (room as any).humidity);

  const battery = (() => {
    const v = (room as any).battery ?? (room as any).batteryPct ?? (room as any).lastPower;
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
  })();

  const tTone = toneFor(temp, thresholds?.temperature, thresholds?.tolerance ?? 2);
  const hTone = toneFor(hum, thresholds?.humidity, thresholds?.tolerance ?? 2);
  const accent = headerAccent(isConnected, temp, hum, thresholds);

  return (
    <button
      type="button"
      onClick={() => onClick?.(room)}
      className="group text-left rounded-xl border border-gray-200 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      title={name}
    >
      <div className={`h-1.5 w-full rounded-t-xl ${accent}`} />

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-gray-300"}`} />
              <h3 className="font-medium text-gray-900 truncate">{ellipsize(name)}</h3>
            </div>
            <p className="mt-1 text-[11px] text-gray-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-gray-600">{formatAbs(lastSeen)}</span>
              <span className="text-gray-400">· {formatRel(lastSeen)}</span>
            </p>
          </div>

          <div className="shrink-0 rounded-lg border border-gray-200 p-2">
            {isConnected ? <Wifi className="w-4 h-4 text-emerald-600" /> : <WifiOff className="w-4 h-4 text-gray-500" />}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border ${tTone.chip}`}>
            <div className="rounded-md border bg-white/60 p-1.5">
              <Thermometer className={`w-4 h-4 ${tTone.text}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Temp</p>
              <p className={`font-semibold leading-5 ${tTone.text}`}>
                {Number.isFinite(temp) ? `${(temp as number).toFixed(1)}°C` : "—"}
              </p>
            </div>
          </div>

          <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border ${hTone.chip}`}>
            <div className="rounded-md border bg-white/60 p-1.5">
              <Droplet className={`w-4 h-4 ${hTone.text}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Humedad</p>
              <p className={`font-semibold leading-5 ${hTone.text}`}>
                {Number.isFinite(hum) ? `${(hum as number).toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {battery != null && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Battery className="w-3.5 h-3.5" />
              <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${battery < 20 ? "bg-rose-500" : battery < 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${battery}%` }}
                />
              </div>
              <span className="tabular-nums">{battery}%</span>
            </div>
          )}
          <div className="text-[11px] text-gray-400 truncate">{(room as any).devEUI ?? ""}</div>
        </div>
      </div>
    </button>
  );
};

/* =========================
   Grid + Controles
========================= */
const SensorCards: React.FC<SensorCardsProps> = ({
  rooms,
  loading = false,
  showControls = true,
  onCardClick,
  thresholds: globalFallback = {},
  className = "",
}) => {
  const { thresholdsByDevEui, getSmartConnection } = useContext(SensorsContext);
  const { historyData } = useContext(WeatherContext);

  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const looseIndex = useMemo(() => buildLooseIndex(historyData || {}), [historyData]);

  const items = useMemo(() => {
    const mapped = (rooms ?? []).map((r, i) => {
      const name = (r as any).deviceName || r.name || `Sensor ${i + 1}`;
      const hist = pickHistory(r, historyData || {}, looseIndex);
      const conn = getSmartConnection(r, hist);

      const lastRaw =
        (hist.length
          ? (hist[hist.length - 1] as any).timestamp ??
            (hist[hist.length - 1] as any).created_at ??
            (hist[hist.length - 1] as any).updatedAt ??
            (hist[hist.length - 1] as any).date
          : (r as any).updatedAt ?? (r as any).lastSeen ?? (r as any).timestamp ?? (r as any).date) ?? null;

      const lastSeen = coerceDate(lastRaw);
      const temp = clampNum((r as any).temperature);
      const hum = clampNum((r as any).humedity ?? (r as any).humidity);

      return {
        name,
        status: conn.isConnected ? 1 : 0,
        updated: lastSeen ? lastSeen.getTime() : 0,
        temp: temp ?? -1e9,
        hum: hum ?? -1e9,
        lastSeen,
        isConnected: conn.isConnected,
        room: r,
      };
    });

    const qn = q.trim().toLowerCase();
    const filtered = qn ? mapped.filter((d) => d.name.toLowerCase().includes(qn)) : mapped;

    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return a.name.localeCompare(b.name) * dir;
      return av > bv ? dir : -dir;
    });

    return sorted;
  }, [rooms, q, sortKey, sortDir, historyData, getSmartConnection, looseIndex]);

  return (
    <section className={`bg-white border border-gray-200 rounded-2xl p-4 ${className}`}>
      {showControls && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar sensor…"
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <label className="text-gray-600">Orden</label>
            <select
              className="border border-gray-300 rounded-md py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={`${sortKey}:${sortDir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split(":") as [SortKey, SortDir];
                setSortKey(k);
                setSortDir(d);
              }}
            >
              <option value="status:desc">Conectados primero</option>
              <option value="updated:desc">Más recientes</option>
              <option value="updated:asc">Más antiguos</option>
              <option value="temp:desc">Temp ↑</option>
              <option value="temp:asc">Temp ↓</option>
              <option value="hum:desc">Humedad ↑</option>
              <option value="hum:asc">Humedad ↓</option>
              <option value="name:asc">Nombre A–Z</option>
              <option value="name:desc">Nombre Z–A</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))] gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white">
              <div className="h-1.5 w-full bg-gray-100 rounded-t-xl" />
              <div className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-2/3 bg-gray-100 rounded" />
                  <div className="h-3 w-1/3 bg-gray-100 rounded" />
                  <div className="h-16 bg-gray-50 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No hay sensores para mostrar.</div>
      ) : (
        <div className="grid [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))] gap-3 sm:gap-4">
          {items.map((d, i) => {
            const devEui = (d.room as any).devEUI as string | undefined;
            const perSensor = devEui && thresholdsByDevEui[devEui];

            const fallback: Thresholds = globalFallback ?? {};
            const resolved: Thresholds = perSensor
              ? {
                  temperature: perSensor.temperature,
                  humidity: perSensor.humidity,
                  tolerance: perSensor.tolerance ?? 2,
                }
              : fallback;

            return (
              <SensorCard
                key={devEui ?? `${d.name}-${i}`}
                room={d.room}
                isConnected={d.isConnected}
                lastSeen={d.lastSeen}
                thresholds={resolved}
                onClick={onCardClick}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

export default SensorCards;
