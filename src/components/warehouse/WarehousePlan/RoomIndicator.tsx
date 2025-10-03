// src/components/warehouse/RoomIndicator.tsx

import React from "react";
import {
  DropletIcon,
  GaugeIcon,
  Thermometer,
  ChevronRight,
  Server,
  Activity,
  Globe,
} from "lucide-react";
import { type Room } from "../../../types/types";

interface Props {
  room: Room & {
    serverHealth?: {
      status: string;
      timestamp: string;
      uptime: number; // en segundos
      environment: string;
    };
  };
  onExpand?: () => void;
  mode?: "summary" | "detail";
}

const formatUptime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  return `${Math.floor(seconds / 86400)} d`;
};

const RoomIndicator: React.FC<Props> = ({ room, onExpand, mode = "summary" }) => {
  const badgeColor = room.alert
    ? "bg-red-100 text-red-600"
    : room.warning
    ? "bg-yellow-100 text-yellow-600"
    : "bg-green-100 text-green-600";

  const renderDetails = (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* MÉTRICAS PRINCIPALES */}
      <div className="mt-2 text-sm space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-700">
          <DropletIcon className="w-4 h-4 text-blue-400" />
          <span className="text-xs">Humedad:</span>
          <span className="font-medium ml-auto">{room.humidity ?? "--"}%</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-700">
          <GaugeIcon className="w-4 h-4 text-purple-400" />
          <span className="text-xs">Productividad:</span>
          <span className="font-medium ml-auto">
            {room.productivity ?? "--"}%
          </span>
        </div>
      </div>

      {/* DATOS DEL SERVIDOR */}
      {room.serverHealth && (
        <div className="mt-3 bg-gray-50 border rounded-md p-2 text-xs space-y-2">
          <p className="text-gray-500 font-semibold mb-1">Estado del Servidor</p>
          <div className="flex items-center gap-2 text-gray-600">
            <Server className="w-3 h-3 text-green-500" />
            <span className="font-medium">{room.serverHealth.status}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Activity className="w-3 h-3 text-blue-500" />
            <span>Uptime: {formatUptime(room.serverHealth.uptime)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Globe className="w-3 h-3 text-gray-500" />
            <span>Entorno: {room.serverHealth.environment}</span>
          </div>
          <p className="text-gray-400">
            {new Date(room.serverHealth.timestamp).toLocaleString("es-DO", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })}
          </p>
        </div>
      )}

      {/* HISTÓRICO */}
      {room.history?.length && (
        <div className="mt-3 bg-gray-50 border rounded-md p-2 text-xs max-h-40 overflow-y-auto space-y-1">
          <p className="text-gray-500 font-semibold mb-1">Historial</p>
          <ul className="divide-y divide-gray-200">
            {room.history.map((entry, i) => (
              <li key={i} className="flex justify-between py-1 gap-x-2">
                <span className="text-gray-500 w-[50px] shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString("es-DO", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
                <div className="flex flex-wrap items-center gap-2 text-gray-600 text-xs">
                  <Thermometer className="w-3 h-3 text-red-400" />
                  {entry.temperature}°C
                  <DropletIcon className="w-3 h-3 text-blue-400" />
                  {entry.humidity ?? "--"}%
                  <GaugeIcon className="w-3 h-3 text-purple-400" />
                  {entry.productivity ?? "--"}%
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderSummary = (
    <div className="mt-2 text-sm space-y-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-700">
        <DropletIcon className="w-4 h-4 text-blue-400" />
        <span className="text-xs">Humedad:</span>
        <span className="font-medium ml-auto">{room.humidity ?? "--"}%</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-700">
        <GaugeIcon className="w-4 h-4 text-purple-400" />
        <span className="text-xs">Productividad:</span>
        <span className="font-medium ml-auto">{room.productivity ?? "--"}%</span>
      </div>

      {/* Estado resumido del servidor */}
      {room.serverHealth && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
          <Server className="w-3 h-3 text-green-500" />
          <span>{room.serverHealth.status}</span>
        </div>
      )}
    </div>
  );

  return (
    <li className="list-none border-b pb-4 last:border-none">
      <div className="flex flex-wrap justify-between items-start font-medium gap-2">
        <div className="flex-1 min-w-[60%]">
          <p className="text-base font-semibold text-gray-800 break-words">
            {room.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Última actualización:{" "}
            {new Date(room.updatedAt).toLocaleString("es-DO", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-sm font-bold rounded-md px-2 py-[2px] ${badgeColor}`}
          >
            {room.temperature}°C
          </span>
          {mode === "summary" && onExpand && (
            <button
              onClick={onExpand}
              className="text-gray-500 hover:text-blue-500 transition"
              title="Ver detalles"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {mode === "detail" ? renderDetails : renderSummary}
    </li>
  );
};

export default RoomIndicator;
