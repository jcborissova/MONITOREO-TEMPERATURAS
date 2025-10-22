/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
import type { Room } from "../../types/types";
import ResponsiveTable from "../ui/ResponsiveTable";

interface ZonesTableProps {
  rooms: Room[];
}

const ZonesTable: React.FC<ZonesTableProps> = ({ rooms }) => {
  // 🔹 Función para formatear valores numéricos
  const formatNumber = (value: number | null | undefined, suffix = "") => {
    if (value == null || Number.isNaN(value)) return "N/A";
    return `${value.toFixed(2)}${suffix}`;
  };

  // 🔹 Definición de columnas (reutilizable)
  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Zona",
        render: (_: any, row: Room) =>
          row.deviceName || row.name || `Zona ${row.id ?? "—"}`,
      },
      {
        key: "temperature",
        label: "Temperatura",
        align: "center" as const,
        render: (v: number) => (
          <span
            className={`font-medium ${
              v > 35 ? "text-red-600" : v < 0 ? "text-blue-600" : "text-gray-800"
            }`}
          >
            {formatNumber(v, " °C")}
          </span>
        ),
      },
      {
        key: "humedity",
        label: "Humedad",
        align: "center" as const,
        render: (v: number) => (
          <span className="text-gray-800">{formatNumber(v, " %")}</span>
        ),
      },
      {
        key: "productivity",
        label: "Productividad",
        align: "center" as const,
        render: (v: number) => (
          <span
            className={`font-semibold ${
              v >= 90
                ? "text-green-600"
                : v >= 70
                ? "text-yellow-600"
                : "text-red-600"
            }`}
          >
            {formatNumber(v, " %")}
          </span>
        ),
      },
      {
        key: "estado",
        label: "Estado",
        align: "center" as const,
        render: (_: any, row: Room) => (
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs sm:text-sm font-semibold ${
              row.alert
                ? "bg-red-100 text-red-700"
                : row.warning
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {row.alert
              ? "Crítico"
              : row.warning
              ? "Advertencia"
              : "Normal"}
          </span>
        ),
      },
    ],
    []
  );

  // 🔹 Render principal
  return (
    <div className="w-full">
      <ResponsiveTable
        data={rooms}
        columns={columns}
        title="Resumen de Zonas"
        emptyMessage="No hay datos disponibles en este momento."
        defaultRowsPerPage={6}
        className="mt-4"
        
      />
    </div>
  );
};

export default ZonesTable;
