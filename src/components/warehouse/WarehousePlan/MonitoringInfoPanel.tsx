/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useMemo, useEffect, useState, useContext, useCallback } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  FireIcon,
  SignalIcon,
  SignalSlashIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import type { Room } from "../../../types/types";
import { WeatherContext } from "../../../context/WeatherContext";

/* ========================= Helpers ========================= */
const toMs = (v: any): number => {
  if (!v && v !== 0) return 0;
  if (v instanceof Date) return isNaN(v.getTime()) ? 0 : v.getTime();
  if (typeof v === "number") {
    const ms = v < 9_999_999_999 ? v * 1000 : v;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  if (typeof v === "string") {
    const s = v.includes(" ") ? v.replace(" ", "T") : v;
    const d = new Date(s);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  const d = new Date(v as any);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

const timeAgo = (ms: number) => {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
};

const connectedWithin = (updatedMs: number, minutes = 5) => {
  if (!updatedMs) return false;
  const GRACE_MS = 60_000; // 60s de gracia
  return Date.now() - updatedMs <= minutes * 60 * 1000 + GRACE_MS;
};

const fmtNum = (v: number | null | undefined, suffix = "") =>
  v == null || Number.isNaN(Number(v)) ? "—" : `${Number(v).toFixed(1)}${suffix}`;

const pct = (num: number, den: number) =>
  den <= 0 ? 0 : Math.round((num / den) * 100);

/* ========================= Subcomponentes ========================= */
const StatTile = ({
  icon,
  label,
  value,
  tone = "default",
  dense = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "default" | "green" | "red" | "yellow" | "blue";
  dense?: boolean;
}) => {
  const toneCls =
    tone === "green"
      ? "text-green-600"
      : tone === "red"
      ? "text-red-600"
      : tone === "yellow"
      ? "text-yellow-600"
      : tone === "blue"
      ? "text-sky-600"
      : "text-gray-800";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={`inline-flex items-center justify-center ${
          dense ? "w-6 h-6" : "w-7 h-7"
        } rounded-lg bg-gray-50 border border-gray-200 text-gray-500 shrink-0`}
      >
        {icon}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] text-gray-500">{label}</p>
        <p
          className={`${dense ? "text-sm" : "text-base sm:text-lg"} font-semibold ${toneCls} truncate`}
        >
          {value}
        </p>
      </div>
    </div>
  );
};

const Pill = ({
  dotClass,
  label,
  count,
  total,
}: {
  dotClass: string;
  label: string;
  count: number;
  total: number;
}) => {
  const p = pct(count, total);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium bg-white">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass}`} />
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-900">{count}</span>
      <span className="text-gray-400">({p}%)</span>
    </span>
  );
};

/* ========================= Panel principal ========================= */
interface InfoProps {
  rooms: Room[];
  /** minutos para considerar “conectado” (default 5) */
  freshnessMinutes?: number;
  className?: string;
  /** inicia colapsado en móviles (default: true) */
  initialCollapsedMobile?: boolean;
}

const MonitoringInfoPanel: React.FC<InfoProps> = ({
  rooms,
  freshnessMinutes = 5,
  className = "",
  initialCollapsedMobile = true,
}) => {
  const { historyData } = useContext(WeatherContext);
  const [collapsed, setCollapsed] = useState(initialCollapsedMobile);

  const latestHistoryMs = useCallback(
    (room: Room): number => {
      const keyByEui = (room as any).devEUI ?? null;
      const keyByName = room.name ?? (room as any).deviceName ?? null;
      const list: any[] =
        (keyByEui && (historyData as any)?.[keyByEui]) ||
        (keyByName && (historyData as any)?.[keyByName]) ||
        [];
      if (!Array.isArray(list) || list.length === 0) return 0;
      let maxMs = 0;
      for (const m of list) {
        const ms = toMs(
          m.timestamp || m.created_at || m.time || m.date || m.updatedAt
        );
        if (ms > maxMs) maxMs = ms;
      }
      return maxMs;
    },
    [historyData]
  );

  // Auto-colapsar en pantallas pequeñas
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setCollapsed(mq.matches ? initialCollapsedMobile : false);
  }, [initialCollapsedMobile]);

  const { latestAbs, latestRel, avgTemp, totals } = useMemo(() => {
    const list = (rooms ?? []).map((r) => {
      const directMs = toMs(
        (r as any).updatedAt ?? (r as any).lastSeen ?? (r as any).timestamp
      );
      const histMs = latestHistoryMs(r);
      const updatedMs = Math.max(directMs, histMs);
      return {
        updatedMs,
        connected: connectedWithin(updatedMs, freshnessMinutes),
        temp:
          (r as any).temperature ??
          (r as any)?.data?.temperature ??
          null,
        alert: !!(r as any).alert,
        warning: !!((r as any).warning && !(r as any).alert),
      };
    });

    const latestMs = list.reduce(
      (max, it) => (it.updatedMs > max ? it.updatedMs : max),
      0
    );
    const latestAbs = latestMs
      ? format(new Date(latestMs), "d LLL y, HH:mm:ss", { locale: es })
      : "—";
    const latestRel = latestMs ? timeAgo(latestMs) : "";

    const connected = list.filter((x) => x.connected).length;
    const disconnected = Math.max(0, list.length - connected);

    // promedio solo con conectados (si no hay, usa todos)
    const pool = connected > 0 ? list.filter((x) => x.connected) : list;
    const temps = pool
      .map((x) => (x.temp == null ? null : Number(x.temp)))
      .filter((n): n is number => Number.isFinite(n));
    const avg = temps.length
      ? temps.reduce((a, b) => a + b, 0) / temps.length
      : null;

    const critical = list.filter((x) => x.alert).length;
    const warning = list.filter((x) => x.warning).length;
    const normal = Math.max(0, list.length - (critical + warning));

    return {
      latestAbs,
      latestRel,
      avgTemp: avg,
      totals: {
        total: list.length,
        connected,
        disconnected,
        critical,
        warning,
        normal,
      },
    };
  }, [rooms, freshnessMinutes, latestHistoryMs]);

  /* ====== UI ====== */
  return (
    <section
      className={[
        "w-full bg-white",
        "px-3 sm:px-5 py-2.5 sm:py-3.5",
        "text-sm text-gray-700",
        "border-t border-gray-200",
        className,
      ].join(" ")}
      aria-label="Resumen del monitoreo"
    >
      {/* CABECERA (móvil) */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-[11px]">
            <ClockIcon className="w-4 h-4 text-gray-500" />
            <span className="font-medium">Últ. act.:</span>
            <span className="text-gray-900">{latestAbs}</span>
            {latestRel && <span className="text-gray-400">({latestRel})</span>}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-expanded={!collapsed}
            aria-controls="monitoring-detail"
          >
            {collapsed ? (
              <>
                Ver detalle <ChevronDownIcon className="w-4 h-4" />
              </>
            ) : (
              <>
                Minimizar <ChevronUpIcon className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {collapsed && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <StatTile
              icon={<FireIcon className="w-5 h-5" />}
              label="Temp. prom."
              value={fmtNum(avgTemp, "°C")}
              tone="blue"
              dense
            />
            <StatTile
              icon={<CheckCircleIcon className="w-5 h-5" />}
              label="Normales"
              value={totals.normal}
              tone="green"
              dense
            />
            <StatTile
              icon={<ExclamationTriangleIcon className="w-5 h-5" />}
              label="Adv."
              value={totals.warning}
              tone="yellow"
              dense
            />
            <StatTile
              icon={<ExclamationCircleIcon className="w-5 h-5" />}
              label="Críticas"
              value={totals.critical}
              tone="red"
              dense
            />
          </div>
        )}
      </div>

      {/* DETALLE */}
      <div
        id="monitoring-detail"
        className={`mt-3 sm:mt-0 ${collapsed ? "hidden sm:block" : "block"}`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-6">
          {/* Columna 1 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-xs">
                <ClockIcon className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Últ. actualización</span>
                <span className="text-gray-900">{latestAbs}</span>
                {latestRel && <span className="text-gray-400">({latestRel})</span>}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatTile
                icon={<FireIcon className="w-5 h-5" />}
                label="Temp. prom."
                value={fmtNum(avgTemp, "°C")}
                tone="blue"
              />
              <StatTile
                icon={<CheckCircleIcon className="w-5 h-5" />}
                label="Normales"
                value={totals.normal}
                tone="green"
              />
              <StatTile
                icon={<ExclamationTriangleIcon className="w-5 h-5" />}
                label="Advertencias"
                value={totals.warning}
                tone="yellow"
              />
              <StatTile
                icon={<ExclamationCircleIcon className="w-5 h-5" />}
                label="Críticas"
                value={totals.critical}
                tone="red"
              />
              <StatTile
                icon={<SignalIcon className="w-5 h-5" />}
                label="Conectadas"
                value={totals.connected}
                tone="green"
              />
              <StatTile
                icon={<SignalSlashIcon className="w-5 h-5" />}
                label="Desconectadas"
                value={totals.disconnected}
                tone="red"
              />
            </div>
          </div>

          {/* Columna 2: Distribución por estado */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500">Distribución por estado</p>
            <div className="flex flex-wrap gap-2">
              <Pill
                dotClass="bg-red-500"
                label="Críticas"
                count={totals.critical}
                total={totals.total}
              />
              <Pill
                dotClass="bg-yellow-500"
                label="Advertencias"
                count={totals.warning}
                total={totals.total}
              />
              <Pill
                dotClass="bg-green-500"
                label="Normales"
                count={totals.normal}
                total={totals.total}
              />
            </div>
          </div>

          {/* Columna 3: Conexión + total */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Conexión</p>
              <span className="text-xs text-gray-500">
                Total zonas: <span className="font-semibold text-gray-700">{totals.total}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill
                dotClass="bg-green-500"
                label="Conectadas"
                count={totals.connected}
                total={totals.connected + totals.disconnected}
              />
              <Pill
                dotClass="bg-red-500"
                label="Desconectadas"
                count={totals.disconnected}
                total={totals.connected + totals.disconnected}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 sm:mt-4 h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    </section>
  );
};

export default MonitoringInfoPanel;
