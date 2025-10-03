import React from "react";
import {
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  XMarkIcon
} from "@heroicons/react/24/solid";

interface Props {
  name: string;
  address: string;
  phone: string;
  hours: string;
  onDetails: () => void;
  onClose?: () => void;
}

const WarehousePopup: React.FC<Props> = ({
  name,
  address,
  phone,
  hours,
  onDetails,
  onClose
}) => {
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
          alt="Logo Bravo"
          className="w-9 h-9 rounded-full border shadow object-cover"
        />
        <h3 className="font-semibold text-[15px] text-gray-900 truncate">
          {name}
        </h3>
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
