/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Label,
} from "recharts";
import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import type { Room } from "../../types/types";

interface StatusPieChartProps {
  rooms: Room[];
  loading?: boolean;
  compact?: boolean; // reduce paddings/alturas para layouts pequeños
  className?: string;
  onSliceClick?: (status: "normal" | "warning" | "critical", names: string[]) => void;
  maxNamesPerGroup?: number; // cuántos nombres mostrar antes de “ver más”
}

/** Paleta daltónico-friendly */
const COLORS = {
  normal: "#22C55E",     // green-500
  warning: "#EAB308",    // yellow-500
  critical: "#EF4444",   // red-500
} as const;

const StatusPieChart: React.FC<StatusPieChartProps> = ({
  rooms,
  loading = false,
  compact = false,
  className = "",
  onSliceClick,
  maxNamesPerGroup = 12,
}) => {
  const [expanded, setExpanded] = useState<{ normal: boolean; warning: boolean; critical: boolean }>({
    normal: false,
    warning: false,
    critical: false,
  });

  const { pieData, total, zoneGroups } = useMemo(() => {
    const criticalZones = (rooms ?? []).filter((r) => r.alert);
    const warningZones = (rooms ?? []).filter((r) => !r.alert && r.warning);
    const normalZones   = (rooms ?? []).filter((r) => !r.alert && !r.warning);

    const data = [
      { key: "normal" as const, name: "Normal",      value: normalZones.length,   color: COLORS.normal },
      { key: "warning" as const, name: "Advertencia", value: warningZones.length, color: COLORS.warning },
      { key: "critical" as const, name: "Crítico",    value: criticalZones.length, color: COLORS.critical },
    ];

    return {
      pieData: data,
      total: rooms?.length ?? 0,
      zoneGroups: {
        normal: normalZones.map((z) => z.deviceName || z.name || "Zona"),
        warning: warningZones.map((z) => z.deviceName || z.name || "Zona"),
        critical: criticalZones.map((z) => z.deviceName || z.name || "Zona"),
      },
    };
  }, [rooms]);

  // Skeleton
  if (loading) {
    return (
      <div
        className={`bg-white border border-gray-100 rounded-2xl shadow-sm p-4 md:p-6 ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-1/2 bg-gray-100 rounded" />
          <div className={`${compact ? "h-[180px]" : "h-[260px]"} bg-gray-50 rounded`} />
          <div className="h-4 w-3/4 bg-gray-100 rounded" />
          <div className="h-4 w-2/3 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className={`flex flex-col items-center justify-center text-gray-400 text-sm bg-white border border-gray-100 rounded-2xl shadow-sm ${compact ? "p-4 h-[200px]" : "p-6 h-[240px]"} ${className}`}>
        Sin datos disponibles
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, fill } = payload[0] ?? {};
      const percentage = total > 0 ? ((Number(value || 0) / total) * 100).toFixed(1) : "0.0";
      return (
        <div className="bg-white border border-gray-200 shadow-lg px-3 py-2 rounded-lg text-sm text-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fill }} />
            <span className="font-semibold">{name}</span>
          </div>
          <p>
            {value} zona{Number(value) !== 1 ? "s" : ""} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const radius = compact
    ? { inner: "42%", outer: "70%" }
    : { inner: "45%", outer: "75%" };

  // Leyenda compacta con totales
  const Legend = () => (
    <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm text-gray-700">
      {pieData.map((d) => {
        const pct = total ? Math.round((d.value / total) * 100) : 0;
        return (
          <button
            key={d.key}
            type="button"
            className="flex items-center gap-2 hover:opacity-80 transition"
            onClick={() => onSliceClick?.(d.key, zoneGroups[d.key])}
            title={`Filtrar: ${d.name}`}
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="truncate">{d.name}</span>
            <span className="text-gray-500">({pct}%)</span>
          </button>
        );
      })}
    </div>
  );

  const GroupList: React.FC<{
    type: "critical" | "warning" | "normal";
    icon: React.ReactNode;
    tone: string;
    title: string;
    items: string[];
  }> = ({ type, icon, tone, title, items }) => {
    if (!items.length) return null;
    const open = expanded[type];
    const visible = open ? items : items.slice(0, maxNamesPerGroup);
    const remaining = Math.max(0, items.length - visible.length);

    return (
      <div className="py-2">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <button
            type="button"
            className={`font-semibold ${tone} hover:opacity-90 transition`}
            onClick={() => setExpanded((e) => ({ ...e, [type]: !e[type] }))}
            aria-expanded={open}
          >
            {title} ({items.length}) {items.length > maxNamesPerGroup && <span className="text-xs text-gray-400">{open ? "• ver menos" : "• ver más"}</span>}
          </button>
        </div>
        <p className="text-gray-700 text-xs md:text-sm ml-6 break-words">
          {visible.join(", ")}
          {remaining > 0 && !open && <span className="text-gray-400">, +{remaining} más</span>}
        </p>
      </div>
    );
  };

  return (
    <div
      className={`bg-white border border-gray-100 rounded-2xl shadow-sm p-4 md:p-6 space-y-4 ${className}`}
      role="region"
      aria-label="Estado general de zonas"
    >
      {/* Título */}
      <div className="text-center">
        <h3 className="text-gray-800 text-base md:text-lg font-semibold">
          Estado General de Zonas
        </h3>
        <p className="text-gray-500 text-xs md:text-sm">
          {total} zona{total !== 1 ? "s" : ""} monitoreadas
        </p>
      </div>

      {/* Leyenda rápida */}
      <Legend />

      {/* Gráfico */}
      <div className={`${compact ? "h-[200px] sm:h-[220px]" : "h-[240px] sm:h-[280px] md:h-[320px]"}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {/* gradientes sutiles por estado */}
              <linearGradient id="grad-normal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.normal} stopOpacity={0.95} />
                <stop offset="100%" stopColor={COLORS.normal} stopOpacity={0.75} />
              </linearGradient>
              <linearGradient id="grad-warning" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.warning} stopOpacity={0.95} />
                <stop offset="100%" stopColor={COLORS.warning} stopOpacity={0.75} />
              </linearGradient>
              <linearGradient id="grad-critical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.critical} stopOpacity={0.95} />
                <stop offset="100%" stopColor={COLORS.critical} stopOpacity={0.75} />
              </linearGradient>
            </defs>

            <Pie
              data={pieData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={radius.inner}
              outerRadius={radius.outer}
              paddingAngle={3}
              isAnimationActive
              onClick={(e) => {
                const dp = (e && (e as any).payload) as { key: "normal" | "warning" | "critical" } | undefined;
                if (dp?.key) onSliceClick?.(dp.key, zoneGroups[dp.key]);
              }}
              labelLine={false}
              label={({ value }: any) =>
                total > 0 ? `${((Number(value) / total) * 100).toFixed(1)}%` : "0%"
              }
            >
              {pieData.map((entry, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={
                    entry.key === "normal"
                      ? "url(#grad-normal)"
                      : entry.key === "warning"
                      ? "url(#grad-warning)"
                      : "url(#grad-critical)"
                  }
                  stroke="#ffffff"
                  strokeWidth={1}
                  cursor="pointer"
                />
              ))}
              <Label
                value={`${total} zonas`}
                position="center"
                fill="#374151"
                fontSize={14}
                fontWeight={600}
              />
            </Pie>

            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Listado de zonas */}
      <div className="divide-y divide-gray-200 text-sm mt-2">
        <GroupList
          type="critical"
          title="Crítico"
          items={zoneGroups.critical}
          icon={<ExclamationCircleIcon className="w-4 h-4 text-red-500" />}
          tone="text-red-600"
        />
        <GroupList
          type="warning"
          title="Advertencia"
          items={zoneGroups.warning}
          icon={<ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />}
          tone="text-yellow-600"
        />
        <GroupList
          type="normal"
          title="Normal"
          items={zoneGroups.normal}
          icon={<CheckCircleIcon className="w-4 h-4 text-green-500" />}
          tone="text-green-600"
        />
      </div>
    </div>
  );
};

export default StatusPieChart;
