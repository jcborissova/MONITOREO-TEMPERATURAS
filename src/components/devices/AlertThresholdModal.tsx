import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface AlertThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  currentMax?: number;
  currentMin?: number;
  onSave: (id: string, maxTemp: number, minTemp: number) => void;
}

const AlertThresholdModal: React.FC<AlertThresholdModalProps> = ({
  isOpen,
  onClose,
  deviceId,
  currentMax = 25,
  currentMin = 10,
  onSave,
}) => {
  const [maxTemp, setMaxTemp] = useState(currentMax);
  const [minTemp, setMinTemp] = useState(currentMin);

  useEffect(() => {
    if (isOpen) {
      setMaxTemp(currentMax);
      setMinTemp(currentMin);
    }
  }, [isOpen, currentMax, currentMin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-xl font-semibold text-gray-800">
            Configurar umbrales de alerta
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Campos */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperatura máxima permitida (°C)
            </label>
            <input
              type="number"
              value={maxTemp}
              onChange={(e) => setMaxTemp(Number(e.target.value))}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperatura mínima permitida (°C)
            </label>
            <input
              type="number"
              value={minTemp}
              onChange={(e) => setMinTemp(Number(e.target.value))}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSave(deviceId, maxTemp, minTemp);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertThresholdModal;
