/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
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
}

const StatusPieChart: React.FC<StatusPieChartProps> = ({ rooms }) => {
  const { pieData, total, zoneGroups } = useMemo(() => {
    const criticalZones = rooms.filter((r) => r.alert);
    const warningZones = rooms.filter((r) => !r.alert && r.warning);
    const normalZones = rooms.filter((r) => !r.alert && !r.warning);

    const data = [
      { name: "Normal", value: normalZones.length, color: "#22c55e" },
      { name: "Advertencia", value: warningZones.length, color: "#facc15" },
      { name: "Crítico", value: criticalZones.length, color: "#ef4444" },
    ];

    return {
      pieData: data,
      total: rooms.length,
      zoneGroups: {
        normal: normalZones.map((z) => z.deviceName || z.name),
        warning: warningZones.map((z) => z.deviceName || z.name),
        critical: criticalZones.map((z) => z.deviceName || z.name),
      },
    };
  }, [rooms]);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[220px] text-gray-400 text-sm">
        <p>Sin datos disponibles</p>
      </div>
    );
  }
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, fill } = payload[0];
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white border border-gray-200 shadow-lg px-3 py-2 rounded-lg text-sm text-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fill }} />
            <span className="font-semibold">{name}</span>
          </div>
          <p>
            {value} zona{value !== 1 ? "s" : ""} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 md:p-6 space-y-4">
      {/* 🔹 Título */}
      <div className="text-center">
        <h3 className="text-gray-800 text-base md:text-lg font-semibold">
          Estado General de Zonas
        </h3>
        <p className="text-gray-500 text-xs md:text-sm">
          Distribución y detalle de zonas según su nivel de alerta
        </p>
      </div>

      {/* 🔹 Gráfico */}
      <div className="h-[220px] sm:h-[260px] md:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius="45%"
              outerRadius="75%"
              paddingAngle={3}
              isAnimationActive
              labelLine={false}
              label={({ value }: any) =>
                total > 0 ? `${((Number(value) / total) * 100).toFixed(1)}%` : "0%"
              }
            >
              {pieData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.color} />
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

      {/* 🔹 Listado de zonas */}
      <div className="divide-y divide-gray-200 text-sm mt-2">
        {zoneGroups.critical.length > 0 && (
          <div className="py-2">
            <div className="flex items-center gap-2 mb-1">
              <ExclamationCircleIcon className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-red-600">
                Crítico ({zoneGroups.critical.length})
              </span>
            </div>
            <p className="text-gray-700 text-xs md:text-sm ml-6">
              {zoneGroups.critical.join(", ")}
            </p>
          </div>
        )}
        {zoneGroups.warning.length > 0 && (
          <div className="py-2">
            <div className="flex items-center gap-2 mb-1">
              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
              <span className="font-semibold text-yellow-600">
                Advertencia ({zoneGroups.warning.length})
              </span>
            </div>
            <p className="text-gray-700 text-xs md:text-sm ml-6">
              {zoneGroups.warning.join(", ")}
            </p>
          </div>
        )}
        {zoneGroups.normal.length > 0 && (
          <div className="py-2">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
              <span className="font-semibold text-green-600">
                Normal ({zoneGroups.normal.length})
              </span>
            </div>
            <p className="text-gray-700 text-xs md:text-sm ml-6">
              {zoneGroups.normal.join(", ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusPieChart;
