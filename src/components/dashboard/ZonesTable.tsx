import React from "react";
import type { Room } from "../../types/types"; // ✅ usa tipo global
 // ✅ usa tipo global

interface ZonesTableProps {
  rooms: Room[];
}

const ZonesTable: React.FC<ZonesTableProps> = ({ rooms }) => {
  return (
    <div className="overflow-x-auto max-w-full">
      <table className="w-full table-auto text-xs sm:text-sm text-left border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-2 sm:px-4 py-2">Zona</th>
            <th className="px-2 sm:px-4 py-2 hidden sm:table-cell">Temp</th>
            <th className="px-2 sm:px-4 py-2 hidden sm:table-cell">Humedad</th>
            <th className="px-2 sm:px-4 py-2 hidden md:table-cell">Prod</th>
            <th className="px-2 sm:px-4 py-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room, idx) => (
            <tr key={idx} className="border-t hover:bg-gray-50">
              <td className="px-2 sm:px-4 py-2 max-w-[120px] truncate">
                {room.name}
              </td>
              <td className="px-2 sm:px-4 py-2 hidden sm:table-cell">
                {room.temperature ?? "N/A"} °C
              </td>
              <td className="px-2 sm:px-4 py-2 hidden sm:table-cell">
                {room.humidity ?? "N/A"}%
              </td>
              <td className="px-2 sm:px-4 py-2 hidden md:table-cell">
                {room.productivity ?? "N/A"}%
              </td>
              <td
                className={`px-2 sm:px-4 py-2 font-semibold ${
                  room.alert
                    ? "text-red-600"
                    : room.warning
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}
              >
                {room.alert
                  ? "Crítico"
                  : room.warning
                  ? "Advertencia"
                  : "Normal"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ZonesTable;
