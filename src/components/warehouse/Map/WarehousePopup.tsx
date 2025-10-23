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

  const statusLabel = alert
    ? "Alerta"
    : warning
    ? "Precaución"
    : "Normal";

  return (
    <div className="relative bg-white max-w-xs w-[90vw] sm:w-[280px] rounded-xl shadow-lg border border-gray-200 p-5 font-sans text-gray-800 text-sm leading-tight">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <img
          src="/assets/images/agrofem.png"
          alt="Logo"
          className="w-10 h-10 rounded-full border shadow-sm object-cover"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-[15px] text-gray-900 leading-snug">
            {name}
          </h3>
          <p className={`text-xs mt-0.5 font-medium ${statusColor}`}>
            Estado: {statusLabel}
          </p>
        </div>
      </div>

      {/* Information */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <MapPinIcon className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
          <p className="text-gray-700 text-[13px] leading-snug">{address}</p>
        </div>
        <div className="flex items-center gap-2">
          <PhoneIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-gray-700 text-[13px]">{phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-gray-700 text-[13px]">{hours}</p>
        </div>
      </div>

      {/* Metrics */}
      {(temperature !== undefined || humedity !== undefined) && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-sm">
          <div className="flex items-center gap-1.5 text-red-600 font-medium">
            <FireIcon className="w-4 h-4" />
            <span>{temperature?.toFixed(1) ?? "—"} °C</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-600 font-medium">
            <CloudIcon className="w-4 h-4" />
            <span>{humedity?.toFixed(1) ?? "—"} %</span>
          </div>
        </div>
      )}

      {/* Button */}
      <button
        onClick={onDetails}
        className="mt-5 w-full py-2.5 text-xs font-semibold tracking-wide text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition-colors"
      >
        Ver detalles
      </button>
    </div>
  );
};

export default WarehousePopup;
