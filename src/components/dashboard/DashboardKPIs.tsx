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

/** ========= Props ========= **/
interface Props {
  totalZones: number;
  connected: number;
  disconnected: number;
  warnings: number;
  critical: number;
  lastUpdateMs?: number | null;
}

/** ========= Utils ========= **/
const pct = (num: number, den: number) =>
  den > 0 ? Math.round((num / den) * 100) : 0;

const fmtRelative = (ms?: number | null) => {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 0) return "en el futuro";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hace <1 min";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
};

const cardBase =
  "group relative rounded-2xl border border-gray-100 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-sm hover:shadow-md transition-all duration-200 p-3.5 sm:p-4";

/** ========= Subcomponentes ========= **/

/* KPI genérica con barra lineal opcional */
const KPIBox: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  barPct?: number; // 0..100
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
    <div className={cardBase} role="group" aria-label={label}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="rounded-xl p-2 sm:p-2.5 ring-8 ring-blue-50 bg-blue-50">
          <div className="text-blue-600">{icon}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[11px] sm:text-xs text-gray-500">{label}</p>
            {badge}
          </div>
          <div className="mt-0.5 flex items-end gap-2">
            <span className="text-xl sm:text-2xl font-semibold text-gray-900 leading-none">
              {value}
            </span>
            {hint && (
              <span className="text-[10px] sm:text-[11px] rounded-full px-1.5 py-0.5 bg-gray-50 ring-1 ring-gray-200 text-gray-700">
                {hint}
              </span>
            )}
          </div>
          {typeof barPct === "number" && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full ${barCls}`}
                style={{ width: `${Math.max(0, Math.min(100, barPct))}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* Progreso circular (conic-gradient) para % conectadas */
const CirclePct: React.FC<{ pct: number; size?: number; tone?: "emerald" | "sky" | "amber" }> = ({
  pct,
  size = 64,
  tone = "emerald",
}) => {
  const cl =
    tone === "emerald"
      ? "#10B981"
      : tone === "amber"
      ? "#F59E0B"
      : "#0EA5E9"; // sky
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
      <div className="grid place-items-center bg-white rounded-full"
        style={{ width: size - 10, height: size - 10 }}>
        <span className="text-xs font-semibold text-gray-700">{safe}%</span>
      </div>
    </div>
  );
};

/** ========= Componente principal ========= **/
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
  const criticalPct = pct(critical, totalZones);

  return (
    <section
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      aria-label="Indicadores principales"
    >
      {/* Zonas monitoreadas + progreso circular de conectadas */}
      <div className={cardBase}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="rounded-xl p-2 sm:p-2.5 ring-8 ring-blue-50 bg-blue-50">
            <Warehouse className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs text-gray-500">Zonas monitoreadas</p>
            <div className="mt-0.5 flex items-end gap-2">
              <span className="text-xl sm:text-2xl font-semibold text-gray-900 leading-none">
                {totalZones}
              </span>
              <span className="text-[11px] text-gray-600">
                {connected}/{totalZones} conectadas
              </span>
            </div>
          </div>
          <CirclePct pct={connectedPct} tone={connectedPct >= 70 ? "emerald" : connectedPct >= 40 ? "sky" : "amber"} />
        </div>

        {/* Línea de tiempo de actualización */}
        <div className="mt-3 flex items-center justify-between text-[11px] sm:text-xs text-gray-500">
          <div className="inline-flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Últ. act.:{" "}
            <b className="text-gray-700">
              {fmtRelative(lastUpdateMs)}
            </b>
          </div>
          {lastUpdateMs ? (
            <span className="text-gray-400">
              {new Date(lastUpdateMs).toLocaleString("es-DO")}
            </span>
          ) : (
            <span className="text-gray-400">(—)</span>
          )}
        </div>
      </div>

      {/* Desconectadas */}
      <KPIBox
        icon={<Activity className="w-5 h-5 sm:w-6 sm:h-6" />}
        label="Desconectadas"
        value={
          <span className="inline-flex items-center gap-1 text-amber-600">
            <WifiOff className="w-4 h-4" />
            {disconnected}
          </span>
        }
        hint={`${disconnectedPct}% del total`}
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
        icon={<AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />}
        label="Advertencias"
        value={<span className="text-amber-600">{warnings}</span>}
        hint={`${warnPct}% de zonas`}
        barPct={warnPct}
        barTone="amber"
      />

      {/* Críticas */}
      <KPIBox
        icon={<Droplet className="w-5 h-5 sm:w-6 sm:h-6" />}
        label="Críticas"
        value={<span className="text-rose-600">{critical}</span>}
        hint={`${criticalPct}% de zonas`}
        barPct={criticalPct}
        barTone="rose"
      />

      {/* Footer compacto */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-4">
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 bg-white">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Online <b className="text-gray-900 ml-1">{connected}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 bg-white">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
            Desconectadas <b className="text-gray-900 ml-1">{disconnected}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 bg-white">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500" />
            Advertencias <b className="text-gray-900 ml-1">{warnings}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 bg-white">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500" />
            Críticas <b className="text-gray-900 ml-1">{critical}</b>
          </span>

          <span className="ml-auto text-gray-400">
            Datos:{" "}
            <b className="text-gray-700">
              {new Date().toLocaleString("es-DO")}
            </b>
          </span>
        </div>
      </div>
    </section>
  );
};

export default DashboardKPIs;
