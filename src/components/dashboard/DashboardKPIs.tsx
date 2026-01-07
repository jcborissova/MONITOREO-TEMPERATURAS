/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import {
  Warehouse,
  AlertTriangle,
  Activity,
  Droplet,
  Wifi,
  WifiOff,
} from "lucide-react";

/* =========================================
   Utils
========================================= */

// Porcentaje seguro
const pct = (num: number, den: number) =>
  den > 0 ? Math.round((num / den) * 100) : 0;

// Tiempo relativo
const fmtRelative = (ms?: number | null) => {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 60000) return "hace <1 min";
  const m = Math.floor(diff / 60000);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
};

// Fecha limpia sin segundos para pie de tarjeta
const fmtShort = (ms?: number | null) => {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleString("es-DO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const cardBase =
  "group relative rounded-2xl border border-gray-100 bg-white/90 backdrop-blur shadow-sm hover:shadow transition-all p-4";


/* =========================================
   Subcomponentes KPI
========================================= */

// Barra lineal
const KPIBox: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  barPct?: number;
  barTone?: "emerald" | "amber" | "rose" | "sky" | "zinc";
  badge?: React.ReactNode;
}> = ({ icon, label, value, hint, barPct, barTone = "zinc", badge }) => {
  const barCls =
    barTone === "emerald"
      ? "bg-emerald-500"
      : barTone === "amber"
      ? "bg-amber-500"
      : barTone === "rose"
      ? "bg-rose-500"
      : barTone === "sky"
      ? "bg-sky-500"
      : "bg-zinc-400";

  return (
    <div className={cardBase}>
      <div className="flex items-center gap-3">
        <div className="rounded-xl p-2.5 ring-8 ring-blue-50 bg-blue-50 text-blue-600">
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">{label}</p>
            {badge}
          </div>

          <div className="mt-0.5 flex items-end gap-2">
            <span className="text-xl font-bold text-gray-900">{value}</span>
            {hint && (
              <span className="text-[11px] rounded-full px-1.5 py-0.5 bg-gray-50 ring-1 ring-gray-200 text-gray-700">
                {hint}
              </span>
            )}
          </div>

          {typeof barPct === "number" && (
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={barCls + " h-full"}
                style={{ width: `${Math.min(100, Math.max(0, barPct))}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// Círculo de % conectado
const CirclePct = ({
  pct,
  size = 64,
  tone = "emerald",
}: {
  pct: number;
  size?: number;
  tone?: "emerald" | "sky" | "amber";
}) => {
  const cl =
    tone === "emerald"
      ? "#10B981"
      : tone === "amber"
      ? "#F59E0B"
      : "#0EA5E9";

  const safe = Math.max(0, Math.min(100, pct));
  const angle = (safe / 100) * 360;

  return (
    <div
      aria-hidden
      className="grid place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${cl} ${angle}deg, #E5E7EB ${angle}deg)`,
      }}
    >
      <div
        className="grid place-items-center bg-white rounded-full"
        style={{ width: size - 10, height: size - 10 }}
      >
        <span className="text-xs font-semibold text-gray-700">{safe}%</span>
      </div>
    </div>
  );
};


/* =========================================
   Componente Principal
========================================= */

interface Props {
  totalZones: number;
  connected: number;
  disconnected: number;
  warnings: number;
  critical: number;
  lastUpdateMs?: number | null;
}

const DashboardKPIs: React.FC<Props> = ({
  totalZones,
  connected,
  disconnected,
  warnings,
  critical,
  lastUpdateMs,
}) => {
  const connectedPct = pct(connected, totalZones);
  const disconnectedPct = pct(disconnected, totalZones);
  const warnPct = pct(warnings, totalZones);
  const critPct = pct(critical, totalZones);

  const tone =
    connectedPct >= 70 ? "emerald" : connectedPct >= 40 ? "sky" : "amber";

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* CARD #1 - Zonas + progreso */}
      <div className={cardBase}>
        <div className="flex items-center gap-4">
          <div className="rounded-xl p-3 ring-8 ring-blue-50 bg-blue-50 text-blue-600">
            <Warehouse className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Zonas monitoreadas</p>
            <div className="mt-0.5 flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {totalZones}
              </span>
              <span className="text-xs text-gray-600">
                {connected}/{totalZones} conectadas
              </span>
            </div>
          </div>

          <CirclePct pct={connectedPct} tone={tone} />
        </div>

        {/* Fecha sin segundos */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-gray-500">
          <div className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Últ. act.: <b className="text-gray-700">{fmtRelative(lastUpdateMs)}</b>
          </div>

          <span className="text-gray-400">{fmtShort(lastUpdateMs)}</span>
        </div>
      </div>

      {/* Desconectadas */}
      <KPIBox
        icon={<Activity className="w-6 h-6" />}
        label="Desconectadas"
        value={
          <span className="inline-flex items-center gap-1 text-amber-600">
            <WifiOff className="w-4 h-4" />
            {disconnected}
          </span>
        }
        hint={`${disconnectedPct}%`}
        barPct={disconnectedPct}
        barTone="amber"
        badge={
          connected > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
              <Wifi className="w-3.5 h-3.5" />
              {connected} on
            </span>
          ) : null
        }
      />

      {/* Advertencias */}
      <KPIBox
        icon={<AlertTriangle className="w-6 h-6" />}
        label="Advertencias"
        value={<span className="text-amber-600">{warnings}</span>}
        hint={`${warnPct}%`}
        barPct={warnPct}
        barTone="amber"
      />

      {/* Críticas */}
      <KPIBox
        icon={<Droplet className="w-6 h-6" />}
        label="Críticas"
        value={<span className="text-rose-600">{critical}</span>}
        hint={`${critPct}%`}
        barPct={critPct}
        barTone="rose"
      />
    </section>
  );
};

export default DashboardKPIs;
