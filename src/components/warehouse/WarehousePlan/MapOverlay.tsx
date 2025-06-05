// src/components/warehouse/MapOverlay.tsx
import React from "react";
import { type Room } from "../../../types/types";

interface Props {
  rooms: Room[];
}

const MapOverlay: React.FC<Props> = ({ rooms }) => {
  const getTagColor = (room: Room) =>
    room.alert
      ? "bg-red-600 text-white"
      : room.warning
      ? "bg-yellow-400 text-black"
      : "bg-green-600 text-white";

  return (
    <div className="relative w-full h-full">
      <img
        src="/assets/Warehouses/Nivel.svg"
        alt="Plano interactivo"
        className="w-full h-full object-contain"
      />

      {rooms.map((room, idx) => (
        <div
          key={idx}
          className={`absolute px-3 py-1 rounded-full text-xs font-medium shadow-xl animate-fade-in ${getTagColor(room)}`}
          style={{
            top: room.top,
            left: room.left,
            transform: "translate(-50%, -50%)",
            minWidth: "110px",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          {room.name}: {room.temperature}°C
        </div>
      ))}
    </div>
  );
};

export default MapOverlay;
