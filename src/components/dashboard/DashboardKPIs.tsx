/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo } from "react";
import { Warehouse, AlertTriangle, Activity, Droplet } from "lucide-react";
import type { Room } from "../../types/types";

interface DashboardKPIsProps {
  rooms: Room[];
  /** total de almacenes (si no llega, calcula por rooms únicas si aplica) */
  totalWarehouses?: number;
  /** muestra skeletons mientras carga */
  loading?: boolean;
  /** click en card */
  onCardClick?: (key: "warehouses" | "alerts" | "productivity" | "zones") => void;
  /** cards más densas para espacios reducidos */
  compact?: boolean;
  /** deshabilitar interacción (solo visual) */
  disabled?: boolean;
  /** aria-label opcional del contenedor */
  ariaLabel?: string;
}

const toneStyles = {
  primary: {
    ring: "ring-blue-100 dark:ring-blue-900/30",
    iconWrap: "bg-blue-50 dark:bg-blue-900/20",
    icon: "text-blue-600 dark:text-blue-400",
    value: "text-gray-900 dark:text-gray-100",
    chip: "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-900/40",
  },
  danger: {
    ring: "ring-red-100 dark:ring-red-900/30",
    iconWrap: "bg-red-50 dark:bg-red-900/20",
    icon: "text-red-600 dark:text-red-400",
    value: "text-red-700 dark:text-red-300",
    chip: "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-900/40",
  },
  success: {
    ring: "ring-green-100 dark:ring-green-900/30",
    iconWrap: "bg-green-50 dark:bg-green-900/20",
    icon: "text-green-600 dark:text-green-400",
    value: "text-green-700 dark:text-green-300",
    chip: "bg-green-50 text-green-700 ring-1 ring-green-100 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-900/40",
  },
  info: {
    ring: "ring-sky-100 dark:ring-sky-900/30",
    iconWrap: "bg-sky-50 dark:bg-sky-900/20",
    icon: "text-sky-600 dark:text-sky-400",
    value: "text-sky-700 dark:text-sky-300",
    chip: "bg-sky-50 text-sky-700 ring-1 ring-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-900/40",
  },
} as const;

type Tone = keyof typeof toneStyles;

/* =========================
   KPI GRID (móvil-first)
========================= */
const DashboardKPIs: React.FC<DashboardKPIsProps> = ({
  rooms,
  totalWarehouses = 12,
  loading = false,
  onCardClick,
  compact = false,
  disabled = false,
  ariaLabel = "Indicadores del dashboard",
}) => {
  const criticalAlerts = useMemo(
    () => (rooms || []).filter((r) => r.alert).length,
    [rooms]
  );

  const avgProductivity = useMemo(() => {
    if (!rooms?.length) return 0;
    const sum = rooms.reduce((acc, r) => acc + (r.productivity ?? 0), 0);
    return Math.round(sum / rooms.length);
  }, [rooms]);

  const gridCls =
    // 1 col en móvil, 2 en sm, 4 en lg; gaps ajustados
    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4";

  if (loading) {
    return (
      <div className={gridCls} role="status" aria-live="polite" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-4 shadow-sm"
          >
            <div className="flex items-center gap-3 animate-pulse">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gray-100 dark:bg-gray-800" />
              <div className="flex-1">
                <div className="h-3.5 w-28 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
                <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      className={gridCls + " pb-[env(safe-area-inset-bottom)]"}
      aria-label={ariaLabel}
    >
      <KPI
        tone="primary"
        icon={<Warehouse className="w-5 h-5 sm:w-6 sm:h-6" />}
        label="Almacenes activos"
        value={totalWarehouses}
        onClick={() => onCardClick?.("warehouses")}
        compact={compact}
        disabled={disabled || !onCardClick}
      />
      <KPI
        tone="danger"
        icon={<AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />}
        label="Alertas críticas"
        value={criticalAlerts}
        subtitle={criticalAlerts > 0 ? "Revisar de inmediato" : "Sin incidencias"}
        onClick={() => onCardClick?.("alerts")}
        compact={compact}
        disabled={disabled || !onCardClick}
      />
      <KPI
        tone="success"
        icon={<Activity className="w-5 h-5 sm:w-6 sm:h-6" />}
        label="Productividad promedio"
        value={`${avgProductivity}%`}
        subtitle={rooms.length ? `${rooms.length} zonas` : undefined}
        onClick={() => onCardClick?.("productivity")}
        compact={compact}
        disabled={disabled || !onCardClick}
      />
      <KPI
        tone="info"
        icon={<Droplet className="w-5 h-5 sm:w-6 sm:h-6" />}
        label="Zonas monitoreadas"
        value={rooms.length}
        onClick={() => onCardClick?.("zones")}
        compact={compact}
        disabled={disabled || !onCardClick}
      />
    </section>
  );
};

/* =========================
   KPI CARD (accesible + responsive)
========================= */
const KPIBase: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  tone?: Tone;
  onClick?: () => void;
  compact?: boolean;
  disabled?: boolean;
}> = ({ icon, label, value, subtitle, tone = "primary", onClick, compact = false, disabled = false }) => {
  const t = toneStyles[tone];

  // sizing responsive
  const pad = compact ? "p-3" : "p-3.5 sm:p-4";
  const minH = compact ? "min-h-[78px]" : "min-h-[86px]";
  const valueSize = compact ? "text-base sm:text-lg" : "text-lg sm:text-xl";
  const labelSize = compact ? "text-[11px]" : "text-[11px] sm:text-xs";

  const interactive = !!onClick && !disabled;

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      className={[
        "group w-full text-left rounded-2xl",
        "border border-gray-100 dark:border-gray-800",
        "bg-white dark:bg-gray-900",
        "shadow-sm hover:shadow-md transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
        "disabled:opacity-70 disabled:cursor-default",
        pad,
        minH,
      ].join(" ")}
      aria-label={`${label}: ${typeof value === "number" ? value : value.toString()}`}
      title={`${label}: ${typeof value === "number" ? value : value.toString()}`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div
          className={[
            "rounded-xl p-2 sm:p-2.5 ring-8 shrink-0",
            t.iconWrap,
            t.ring,
            "transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none",
          ].join(" ")}
        >
          <div className={t.icon}>{icon}</div>
        </div>

        <div className="min-w-0 flex-1">
          <p className={`${labelSize} text-gray-500 dark:text-gray-400 truncate`} title={label}>
            {label}
          </p>

          <div className="mt-0.5 flex items-center gap-2">
            <span className={`${valueSize} font-semibold ${t.value}`}>{value}</span>

            {subtitle && (
              <span
                className={[
                  "text-[10px] sm:text-[11px] rounded-full px-1.5 py-0.5",
                  "whitespace-nowrap",
                  t.chip,
                ].join(" ")}
                title={subtitle}
              >
                {subtitle}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Línea decorativa sutil */}
      <div className="mt-2 h-0.5 w-0 group-hover:w-full transition-all duration-300 rounded-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 motion-reduce:transition-none" />
    </button>
  );
};

const KPI = React.memo(KPIBase);
export default DashboardKPIs;
