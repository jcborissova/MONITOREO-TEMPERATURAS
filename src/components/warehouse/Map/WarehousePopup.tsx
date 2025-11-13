// src/components/warehouse/Map/WarehousePopup.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

interface Props {
  name: string;
  address: string;
  phone: string;
  hours: string;
  temperature?: number;
  humedity?: number;
  onDetails: () => void;
  onClose?: () => void;
}

const WarehousePopup: React.FC<Props> = ({
  name,
  address,
  phone,
  hours,
  temperature,
  humedity,
  onDetails,
  onClose,
}) => {
  const Temp =
    typeof temperature === "number" && Number.isFinite(temperature)
      ? `${temperature.toFixed(1)}°C`
      : "—";
  const Hum =
    typeof humedity === "number" && Number.isFinite(humedity)
      ? `${humedity.toFixed(0)}%`
      : "—";

  return (
    <div className="relative bg-white w-[86vw] max-w-[360px] sm:w-[280px] rounded-xl shadow-lg border border-gray-200 p-4 text-gray-800">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          aria-label="Cerrar"
        >
          ✕
        </button>
      )}

      <div className="flex items-center gap-3">
        <img
          src="/assets/images/smart-electric-solution.png"
          alt="Logo"
          className="w-9 h-9 rounded-full border object-cover"
        />
        <div className="min-w-0">
          <h3 className="font-semibold text-[15px] text-gray-900 truncate">{name}</h3>
          <p className="text-[11px] text-gray-500">Sucursal</p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-[13px] leading-snug">
        <p><span className="font-medium">Dirección: </span>{address}</p>
        <p><span className="font-medium">Teléfono: </span>{phone}</p>
        <p><span className="font-medium">Horario: </span>{hours}</p>
      </div>

      {(temperature !== undefined || humedity !== undefined) && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-gray-200 px-2 py-1.5">
            <div className="text-[11px] text-gray-500">Temperatura</div>
            <div className="font-semibold">{Temp}</div>
          </div>
          <div className="rounded-lg border border-gray-200 px-2 py-1.5">
            <div className="text-[11px] text-gray-500">Humedad</div>
            <div className="font-semibold">{Hum}</div>
          </div>
        </div>
      )}

      <button
        onClick={onDetails}
        className="mt-4 w-full py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
      >
        Ver detalles
      </button>
    </div>
  );
};

export default WarehousePopup;
