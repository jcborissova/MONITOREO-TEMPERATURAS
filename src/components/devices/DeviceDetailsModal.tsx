/* eslint-disable no-constant-binary-expression */
import React from "react";
import {
  XMarkIcon,
  InformationCircleIcon,
  CubeTransparentIcon,
} from "@heroicons/react/24/outline";
import type { Room } from "../../types/types";

interface DeviceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Room;
}

const DeviceDetailsModal: React.FC<DeviceDetailsModalProps> = ({
  isOpen,
  onClose,
  device,
}) => {
  if (!isOpen) return null;

  // ✅ Imagen o ícono por defecto
  const imageSrc =
    device.imageUrl ||
    "/images/device.png" ||
    "https://cdn-icons-png.flaticon.com/512/1048/1048947.png";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative border border-gray-100">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-4">
          <InformationCircleIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            Detalles del dispositivo
          </h2>
        </div>

        {/* Imagen del dispositivo o ícono por defecto */}
        <div className="flex justify-center mb-6 relative">
          <div className="absolute w-32 h-32 bg-blue-50 rounded-full blur-xl opacity-60"></div>

          {device.imageUrl ? (
            <img
              src={imageSrc}
              alt={device.name}
              className="w-40 h-40 object-cover rounded-lg shadow-md border border-gray-100 relative z-10"
            />
          ) : (
            <div className="w-36 h-36 flex items-center justify-center bg-gray-100 rounded-xl border shadow-inner relative z-10">
              <CubeTransparentIcon className="w-14 h-14 text-gray-400" />
            </div>
          )}
        </div>

        {/* Información del dispositivo */}
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>Zona:</strong> {device.name}
          </p>
          <p>
            <strong>Temperatura actual:</strong> {device.temperature.toFixed(1)} °C
          </p>
          <p>
            <strong>Humedad actual:</strong>{" "}
            {device.humidity ? `${device.humidity.toFixed(1)} %` : "—"}
          </p>
          <p>
            <strong>Última actualización:</strong>{" "}
            {new Date(device.updatedAt).toLocaleString("es-DO")}
          </p>
        </div>

        {/* Historial */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-800 mb-2">Historial reciente</h3>
          {device.history && device.history.length > 0 ? (
            <div className="max-h-40 overflow-y-auto border rounded-lg text-sm">
              <table className="w-full">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="py-2 px-3">Fecha</th>
                    <th className="py-2 px-3 text-right">Temp (°C)</th>
                    <th className="py-2 px-3 text-right">Humedad (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {device.history.map((entry, i) => (
                    <tr key={i} className="border-t text-gray-700">
                      <td className="py-1 px-3">
                        {new Date(entry.timestamp).toLocaleString("es-DO")}
                      </td>
                      <td className="py-1 px-3 text-right">
                        {entry.temperature.toFixed(1)}
                      </td>
                      <td className="py-1 px-3 text-right">
                        {entry.humidity?.toFixed(1) ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center border rounded-lg py-3 bg-gray-50">
              No hay registros históricos disponibles.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceDetailsModal;
