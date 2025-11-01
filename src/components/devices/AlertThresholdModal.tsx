/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from "react";
import BaseModal from "../ui/BaseModal";
import ModalHeader from "../ui/ModalHeader";
import ModalFooter from "../ui/ModalFooter";
import { useToast } from "../../hooks/useToast";
import {
  getThresholdByDevEui,     // ← usa el smart
  upsertThresholdByDevEui,
} from "../../services/thresholds.service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** dev_eui o identificador único resoluble en API */
  deviceId: string;
}

/** helpers numéricas seguras */
const toNum = (v: unknown, fb: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

const DEFAULTS = {
  tempMin: 10,
  tempMax: 25,
  humMin: 30,
  humMax: 70,
};

const AlertThresholdModal: React.FC<Props> = ({
  isOpen,
  onClose,
  deviceId,
}) => {
  const { showToast, ToastContainer } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [maxTemp, setMaxTemp] = useState<number>(DEFAULTS.tempMax);
  const [minTemp, setMinTemp] = useState<number>(DEFAULTS.tempMin);
  const [maxHum, setMaxHum] = useState<number>(DEFAULTS.humMax);
  const [minHum, setMinHum] = useState<number>(DEFAULTS.humMin);

  const isValid = useMemo(() => {
    const tOk = minTemp <= maxTemp && minTemp >= -50 && maxTemp <= 100;
    const hOk = minHum <= maxHum && minHum >= 0 && maxHum <= 100;
    return tOk && hOk;
  }, [minTemp, maxTemp, minHum, maxHum]);

  // 🔎 Fetch individual al abrir con el deviceId
  useEffect(() => {
    if (!isOpen) return;
    if (!deviceId) {
      setError("No se reconoció el dispositivo");
      return;
    }

    let cancelled = false;
    const fetchThresholds = async () => {
      setLoading(true);
      setError("");
      try {
        const th = await getThresholdByDevEui(deviceId);
        if (cancelled) return;

        // Si no hay datos previos en API, usar defaults
        setMaxTemp(toNum(th?.temperature_max, DEFAULTS.tempMax));
        setMinTemp(toNum(th?.temperature_min, DEFAULTS.tempMin));
        setMaxHum(toNum(th?.humidity_max, DEFAULTS.humMax));
        setMinHum(toNum(th?.humidity_min, DEFAULTS.humMin));
      } catch (e: any) {
        // Si 404 u otro, usamos defaults pero mostramos aviso suave
        setMaxTemp(DEFAULTS.tempMax);
        setMinTemp(DEFAULTS.tempMin);
        setMaxHum(DEFAULTS.humMax);
        setMinHum(DEFAULTS.humMin);
        setError("");
      } finally {
        setLoading(false);
      }
    };

    fetchThresholds();
    return () => {
      cancelled = true;
    };
  }, [isOpen, deviceId]);

  // Guardar en API (upsert)
  const handleSave = async () => {
    if (!deviceId) {
      showToast("error", "No se reconoce el dispositivo.");
      return;
    }
    if (!isValid) {
      showToast("error", "Los valores ingresados no son válidos ❌");
      return;
    }
    try {
      setSaving(true);
      await upsertThresholdByDevEui(deviceId, {
        temperature_max: clamp(toNum(maxTemp, DEFAULTS.tempMax), -50, 100),
        temperature_min: clamp(toNum(minTemp, DEFAULTS.tempMin), -50, 100),
        humidity_max: clamp(toNum(maxHum, DEFAULTS.humMax), 0, 100),
        humidity_min: clamp(toNum(minHum, DEFAULTS.humMin), 0, 100),
      });
      showToast("success", "Umbrales guardados correctamente");
      setTimeout(onClose, 900);
    } catch (e: any) {
      showToast("error", "Error al guardar los umbrales");
    } finally {
      setSaving(false);
    }
  };

  // Validaciones guiadas
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
        <ModalHeader
          title={
            deviceId
              ? `Configurar umbrales de alerta — ${deviceId}`
              : "Configurar umbrales de alerta"
          }
          onClose={onClose}
        />

        {/* Loading / Error */}
        {loading && (
          <div className="p-4 text-sm text-gray-600">
            Cargando configuración del dispositivo...
          </div>
        )}
        {!!error && !loading && (
          <div className="p-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
            {error}
          </div>
        )}

        {!loading && (
          <div className="space-y-6">
            {/* Temperatura */}
            <div className="border border-gray-200 rounded-xl p-4 sm:p-5">
              <h3 className="font-semibold text-gray-800 mb-3 text-base sm:text-lg">Temperatura (°C)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Mínima</label>
                  <input
                    type="number"
                    value={minTemp}
                    min={-50}
                    max={maxTemp}
                    disabled={saving}
                    onChange={(e) => handleMinTemp(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 sm:p-2.5 text-sm focus:ring-2 outline-none ${
                      minTemp > maxTemp ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
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
                    disabled={saving}
                    onChange={(e) => handleMaxTemp(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 sm:p-2.5 text-sm focus:ring-2 outline-none ${
                      maxTemp < minTemp ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Humedad */}
            <div className="border border-gray-200 rounded-xl p-4 sm:p-5">
              <h3 className="font-semibold text-gray-800 mb-3 text-base sm:text-lg">Humedad (%RH)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Mínima</label>
                  <input
                    type="number"
                    value={minHum}
                    min={0}
                    max={maxHum}
                    disabled={saving}
                    onChange={(e) => handleMinHum(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 sm:p-2.5 text-sm focus:ring-2 outline-none ${
                      minHum > maxHum ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
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
                    disabled={saving}
                    onChange={(e) => handleMaxHum(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 sm:p-2.5 text-sm focus:ring-2 outline-none ${
                      maxHum < minHum ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <ModalFooter
          onCancel={onClose}
          onConfirm={handleSave}
          confirmDisabled={!isValid || saving || loading || !deviceId}
          isLoading={saving}
        />
      </BaseModal>
    </>
  );
};

export default AlertThresholdModal;
