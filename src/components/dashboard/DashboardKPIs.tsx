/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React from "react";
import { Warehouse, AlertTriangle, Activity, Droplet } from "lucide-react";

interface Props {
  totalZones: number;
  connected: number;
  disconnected: number;
  warnings: number;
  critical: number;
  lastUpdateMs?: number | null;
}

const tone = {
  base:
    "rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 p-3.5 sm:p-4",
  label: "text-[11px] sm:text-xs text-gray-500",
  value: "text-lg sm:text-xl font-semibold",
};

const KPI: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subtitle?: string;
}> = ({ icon, label, value, subtitle }) => (
  <div className={tone.base}>
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="rounded-xl p-2 sm:p-2.5 ring-8 ring-blue-50 bg-blue-50">
        <div className="text-blue-600">{icon}</div>
      </div>
      <div className="min-w-0">
        <p className={tone.label}>{label}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className={`${tone.value} text-gray-800`}>{value}</span>
          {subtitle && (
            <span className="text-[10px] sm:text-[11px] rounded-full px-1.5 py-0.5 bg-gray-50 ring-1 ring-gray-200 text-gray-700">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
);

const formatRelative = (ms?: number | null) => {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 0) return "en el futuro";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "hace <1 min";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
};

const DashboardKPIs: React.FC<Props> = ({
  totalZones,
  connected,
  disconnected,
  warnings,
  critical,
  lastUpdateMs,
}) => {
  const grid = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4";
  const connectedLine =
    totalZones > 0 ? `${connected}/${totalZones} conectadas · ${Math.round((connected / totalZones) * 100)}%` : "—";

  return (
    <section className={grid}>
      <KPI
        icon={<Warehouse className="w-5 h-5 sm:w-6 sm:h-6" />}
        label="Zonas monitoreadas"
        value={totalZones}
        subtitle={connectedLine}
      />
      <KPI
        icon={<Activity className="w-5 h-5 sm:w-6 sm:h-6" />}
        label="Desconectadas"
        value={<span className="text-amber-600">{disconnected}</span>}
        subtitle={connected > 0 ? "Conectadas arriba" : undefined}
      />
      <KPI
        icon={<AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />}
        label="Advertencias"
        value={<span className="text-yellow-600">{warnings}</span>}
        subtitle="Fuera de umbral leve"
      />
      <KPI
        icon={<Droplet className="w-5 h-5 sm:w-6 sm:h-6" />}
        label="Críticas"
        value={<span className="text-red-600">{critical}</span>}
        subtitle="Fuera de umbral severo"
      />

      <div className="col-span-1 sm:col-span-2 lg:col-span-4 mt-1">
        <p className="text-[11px] sm:text-xs text-gray-500">
          Datos: <b className="text-gray-700">{new Date().toLocaleString("es-DO")}</b>{" • "}
          Actualizado:{" "}
          <b className="text-gray-700">
            {formatRelative(lastUpdateMs ?? null)}
          </b>
          {lastUpdateMs ? ` (${new Date(lastUpdateMs).toLocaleString("es-DO")})` : " (—)"}
        </p>
      </div>
    </section>
  );
};

export default DashboardKPIs;
