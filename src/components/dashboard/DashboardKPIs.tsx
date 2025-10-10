/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { Warehouse, AlertTriangle, Activity, Droplet } from "lucide-react";
import type { Room } from "../../types/types"; // ✅ usa tu tipo global
 // ✅ usa tu tipo global

interface DashboardKPIsProps {
  rooms: Room[];
}

const DashboardKPIs: React.FC<DashboardKPIsProps> = ({ rooms }) => {
  const totalWarehouses = 12;
  const criticalAlerts = rooms.filter((r) => r.alert).length;
  const warningAlerts = rooms.filter((r) => r.warning).length;

  const avgProductivity =
    rooms.length > 0
      ? Math.round(
          rooms.reduce(
            (acc, r) => acc + (r.productivity ?? 0),
            0
          ) / rooms.length
        )
      : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
      <KPI
        icon={<Warehouse className="w-5 h-5 sm:w-7 sm:h-7 text-blue-600" />}
        label="Almacenes Activos"
        value={totalWarehouses}
      />
      <KPI
        icon={<AlertTriangle className="w-5 h-5 sm:w-7 sm:h-7 text-red-600" />}
        label="Alertas Críticas"
        value={criticalAlerts}
        valueClass="text-red-600"
      />
      <KPI
        icon={<Activity className="w-5 h-5 sm:w-7 sm:h-7 text-green-600" />}
        label="Productividad Promedio"
        value={`${avgProductivity}%`}
        valueClass="text-green-600"
      />
      <KPI
        icon={<Droplet className="w-5 h-5 sm:w-7 sm:h-7 text-blue-400" />}
        label="Zonas Monitoreadas"
        value={rooms.length}
      />
    </div>
  );
};

const KPI: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueClass?: string;
}> = ({ icon, label, value, valueClass }) => (
  <div className="bg-white shadow rounded-lg p-3 sm:p-5 flex items-center gap-3">
    {icon}
    <div>
      <p className="text-gray-500 text-xs sm:text-sm">{label}</p>
      <p
        className={`text-lg sm:text-xl font-semibold ${
          valueClass || "text-gray-800"
        }`}
      >
        {value}
      </p>
    </div>
  </div>
);

export default DashboardKPIs;
