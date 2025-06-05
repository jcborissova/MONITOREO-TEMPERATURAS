// src/components/warehouse/MonitoringInfoPanel.tsx
import React from "react";
import { type Room } from "../../../types/types";
import { format } from "date-fns";

interface Props {
  rooms: Room[];
}

const MonitoringInfoPanel: React.FC<Props> = ({ rooms }) => {
  const total = rooms.length;
  const alerts = rooms.filter(r => r.alert).length;
  const warnings = rooms.filter(r => r.warning && !r.alert).length;
  const normal = total - alerts - warnings;
  const avgTemp =
    total > 0
      ? (rooms.reduce((sum, r) => sum + r.temperature, 0) / total).toFixed(1)
      : "--";

  const latestUpdate = rooms.length
    ? rooms
        .map(room => new Date(room.updatedAt))
        .reduce((latest, current) => (current > latest ? current : latest))
    : null;

  return (
    <div className="bg-white border-t px-6 py-4 text-sm text-gray-700">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-500">Actualizado</p>
          <p className="font-medium">
            {latestUpdate ? format(latestUpdate, "PPpp") : "--"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Temperatura Prom.</p>
          <p className="font-medium">{avgTemp}°C</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Zonas Críticas</p>
          <p className="font-semibold text-red-600">{alerts}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Zonas Normales</p>
          <p className="font-semibold text-green-600">{normal}</p>
        </div>
      </div>
    </div>
  );
};

export default MonitoringInfoPanel;
