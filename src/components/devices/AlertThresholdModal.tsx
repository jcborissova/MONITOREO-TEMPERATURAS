import React, { useState, useEffect } from "react";
import BaseModal from "../ui/BaseModal";
import ModalHeader from "../ui/ModalHeader";
import ModalFooter from "../ui/ModalFooter";
import { useToast } from "../../hooks/useToast";

interface AlertThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  currentMax?: number;
  currentMin?: number;
  onSave: (
    id: string,
    maxTemp: number,
    minTemp: number,
    maxHum: number,
    minHum: number
  ) => Promise<void> | void;
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
  const [maxHum, setMaxHum] = useState(80);
  const [minHum, setMinHum] = useState(30);
  const [isValid, setIsValid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    if (isOpen) {
      setMaxTemp(currentMax);
      setMinTemp(currentMin);
      setMaxHum(80);
      setMinHum(30);
      setIsValid(true);
      setIsSaving(false);
    }
  }, [isOpen, currentMax, currentMin]);

  useEffect(() => {
    const valid =
      minTemp <= maxTemp &&
      minHum <= maxHum &&
      minTemp >= -50 &&
      maxTemp <= 100 &&
      minHum >= 0 &&
      maxHum <= 100;

    setIsValid(valid);
  }, [minTemp, maxTemp, minHum, maxHum]);

  const handleSave = async () => {
    if (!isValid) {
      showToast("error", "Los valores ingresados no son válidos ❌");
      return;
    }

    try {
      setIsSaving(true);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // simulación
      await onSave(deviceId, maxTemp, minTemp, maxHum, minHum);
      showToast("success", "Umbrales guardados correctamente");
      setTimeout(onClose, 1500);
    } catch {
      showToast("error", "Error al guardar los umbrales");
    } finally {
      setIsSaving(false);
    }
  };

  // Validaciones dinámicas
  const handleMinTemp = (v: number) => {
    if (v > maxTemp) return showToast("error", "La temperatura mínima no puede ser mayor que la máxima.");
    setMinTemp(v);
  };

  const handleMaxTemp = (v: number) => {
    if (v < minTemp) return showToast("error", "La temperatura máxima no puede ser menor que la mínima.");
    setMaxTemp(v);
  };

  const handleMinHum = (v: number) => {
    if (v > maxHum) return showToast("error", "La humedad mínima no puede ser mayor que la máxima.");
    setMinHum(v);
  };

  const handleMaxHum = (v: number) => {
    if (v < minHum) return showToast("error", "La humedad máxima no puede ser menor que la mínima.");
    setMaxHum(v);
  };

  return (
    <>
      {ToastContainer}

      <BaseModal isOpen={isOpen} onClose={onClose}>
        <ModalHeader title="Configurar umbrales de alerta" onClose={onClose} />

        <div className="space-y-6">
          {/* 🌡️ Temperatura */}
          <div className="border border-gray-200 rounded-xl p-4 sm:p-5">
            <h3 className="font-semibold text-gray-800 mb-3 text-base sm:text-lg">
              Temperatura (°C)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Mínima</label>
                <input
                  type="number"
                  value={minTemp}
                  min={-50}
                  max={maxTemp}
                  disabled={isSaving}
                  onChange={(e) => handleMinTemp(Number(e.target.value))}
                  className={`w-full border rounded-lg p-2 sm:p-2.5 text-sm focus:ring-2 outline-none ${
                    minTemp > maxTemp
                      ? "border-red-500 focus:ring-red-500"
                      : "focus:ring-blue-500"
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Máxima</label>
                <input
                  type="number"
                  value={maxTemp}
                  min={minTemp}
                  max={100}
                  disabled={isSaving}
                  onChange={(e) => handleMaxTemp(Number(e.target.value))}
                  className={`w-full border rounded-lg p-2 sm:p-2.5 text-sm focus:ring-2 outline-none ${
                    maxTemp < minTemp
                      ? "border-red-500 focus:ring-red-500"
                      : "focus:ring-blue-500"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 💧 Humedad */}
          <div className="border border-gray-200 rounded-xl p-4 sm:p-5">
            <h3 className="font-semibold text-gray-800 mb-3 text-base sm:text-lg">
              Humedad (%)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Mínima</label>
                <input
                  type="number"
                  value={minHum}
                  min={0}
                  max={maxHum}
                  disabled={isSaving}
                  onChange={(e) => handleMinHum(Number(e.target.value))}
                  className={`w-full border rounded-lg p-2 sm:p-2.5 text-sm focus:ring-2 outline-none ${
                    minHum > maxHum
                      ? "border-red-500 focus:ring-red-500"
                      : "focus:ring-blue-500"
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Máxima</label>
                <input
                  type="number"
                  value={maxHum}
                  min={minHum}
                  max={100}
                  disabled={isSaving}
                  onChange={(e) => handleMaxHum(Number(e.target.value))}
                  className={`w-full border rounded-lg p-2 sm:p-2.5 text-sm focus:ring-2 outline-none ${
                    maxHum < minHum
                      ? "border-red-500 focus:ring-red-500"
                      : "focus:ring-blue-500"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ⚙️ Botones */}
        <ModalFooter
          onCancel={onClose}
          onConfirm={handleSave}
          confirmDisabled={!isValid}
          isLoading={isSaving}
        />
      </BaseModal>
    </>
  );
};

export default AlertThresholdModal;
