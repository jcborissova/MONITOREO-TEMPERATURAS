/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import {
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  XMarkIcon,
  FireIcon,
  CloudIcon,
} from "@heroicons/react/24/solid";

interface Props {
  name: string;
  address: string;
  phone: string;
  hours: string;
  temperature?: number;
  humedity?: number;
  alert?: boolean;
  warning?: boolean;
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
  alert,
  warning,
  onDetails,
  onClose,
}) => {
  const statusColor = alert
    ? "text-red-600"
    : warning
    ? "text-yellow-500"
    : "text-green-600";

  const statusText = alert
    ? "⚠️ Alerta"
    : warning
    ? "⚠️ Precaución"
    : "✅ Normal";

  return (
    <div className="relative bg-white max-w-xs w-[90vw] sm:w-[260px] rounded-2xl shadow-lg border border-gray-200 p-4 font-sans text-gray-800 text-sm leading-tight">
      {/* Botón Cerrar */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-500 transition"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      )}

      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-3 pr-8">
        <img
          src="/assets/images/agrofem.png"
          alt="Logo"
          className="w-9 h-9 rounded-full border shadow object-cover"
        />
        <div>
          <h3 className="font-semibold text-[15px] text-gray-900 truncate">
            {name}
          </h3>
          <p className={`text-xs font-medium ${statusColor}`}>{statusText}</p>
        </div>
      </div>

      {/* Información */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <MapPinIcon className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
          <p>{address}</p>
        </div>
        <div className="flex items-center gap-2">
          <PhoneIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p>{phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p>{hours}</p>
        </div>

        {/* Temperatura y humedad */}
        {(temperature !== undefined || humedity !== undefined) && (
          <div className="flex items-center justify-between pt-2 text-sm">
            <div className="flex items-center gap-1 text-red-600">
              <FireIcon className="w-4 h-4" />
              <span>{temperature?.toFixed(1) ?? "—"}°C</span>
            </div>
            <div className="flex items-center gap-1 text-blue-600">
              <CloudIcon className="w-4 h-4" />
              <span>{humedity?.toFixed(1) ?? "—"}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Acción */}
      <button
        onClick={onDetails}
        className="mt-4 w-full py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 rounded-lg shadow-sm transition-all"
      >
        Ver Detalles
      </button>
    </div>
  );
};

export default WarehousePopup;
