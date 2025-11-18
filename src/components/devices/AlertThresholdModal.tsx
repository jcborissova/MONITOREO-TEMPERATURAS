/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import BaseModal from "../ui/BaseModal";
import ModalHeader from "../ui/ModalHeader";
import ModalFooter from "../ui/ModalFooter";
import { useToast } from "../../hooks/useToast";
import {
  getThresholdByDevEui,
  upsertThresholdByDevEui,
} from "../../services/thresholds.service";
import {
  BellAlertIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";
import { FireIcon, CloudIcon } from "@heroicons/react/24/solid";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  deviceLabel?: string;
}

/* Helpers numéricos básicos */
const toNum = (v: unknown, fb: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

/* Valores recomendados */
const DEFAULTS = {
  tempMin: 10,
  tempMax: 25,
  humMin: 30,
  humMax: 70,
};

/* Regex: máx 3 enteros y 3 decimales */
const TEMP_REGEX = /^-?\d{0,3}(?:\.\d{0,3})?$/; // permite negativos
const HUM_REGEX = /^\d{0,3}(?:\.\d{0,3})?$/; // solo positivos

type ThresholdForm = {
  tempMin: string;
  tempMax: string;
  humMin: string;
  humMax: string;
};

type ThresholdErrors = {
  tempMin: string;
  tempMax: string;
  humMin: string;
  humMax: string;
};

const EMPTY_ERRORS: ThresholdErrors = {
  tempMin: "",
  tempMax: "",
  humMin: "",
  humMax: "",
};

const buildFormFromApi = (th: any | null | undefined): ThresholdForm => ({
  tempMin: String(toNum(th?.temperature_min, DEFAULTS.tempMin)),
  tempMax: String(toNum(th?.temperature_max, DEFAULTS.tempMax)),
  humMin: String(toNum(th?.humidity_min, DEFAULTS.humMin)),
  humMax: String(toNum(th?.humidity_max, DEFAULTS.humMax)),
});

const AlertThresholdModal: React.FC<Props> = ({
  isOpen,
  onClose,
  deviceId,
  deviceLabel,
}) => {
  const { showToast, ToastContainer } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [form, setForm] = useState<ThresholdForm>({
    tempMin: String(DEFAULTS.tempMin),
    tempMax: String(DEFAULTS.tempMax),
    humMin: String(DEFAULTS.humMin),
    humMax: String(DEFAULTS.humMax),
  });

  const [fieldErrors, setFieldErrors] = useState<ThresholdErrors>(EMPTY_ERRORS);

  const displayName = deviceLabel || deviceId || "Sensor sin nombre";
  const displayId = deviceId || "ID no disponible";

  /* Validación general para deshabilitar Guardar */
  const isValid = useMemo(() => {
    // Errores por campo
    if (Object.values(fieldErrors).some((e) => e)) return false;
    // Campos vacíos
    if (Object.values(form).some((v) => v === "")) return false;

    const tempMin = Number(form.tempMin);
    const tempMax = Number(form.tempMax);
    const humMin = Number(form.humMin);
    const humMax = Number(form.humMax);

    if (
      !Number.isFinite(tempMin) ||
      !Number.isFinite(tempMax) ||
      !Number.isFinite(humMin) ||
      !Number.isFinite(humMax)
    ) {
      return false;
    }

    const tOk =
      tempMin <= tempMax &&
      tempMin >= -50 &&
      tempMax <= 100;

    const hOk =
      humMin <= humMax &&
      humMin >= 0 &&
      humMax <= 100;

    return tOk && hOk;
  }, [form, fieldErrors]);

  /* Validación por campo */
  const validateField = (
    name: keyof ThresholdForm,
    value: string,
    current: ThresholdForm
  ): string => {
    if (value === "") return "Este campo es requerido.";

    const isHumidity = name === "humMin" || name === "humMax";
    const regex = isHumidity ? HUM_REGEX : TEMP_REGEX;

    if (!regex.test(value)) {
      return "Formato inválido (máx 3 enteros y 3 decimales).";
    }

    const n = Number(value);
    if (!Number.isFinite(n)) return "Valor no numérico.";

    if (!isHumidity) {
      // Temperatura
      if (n < -50 || n > 100) {
        return "Debe estar entre -50 y 100.";
      }
      if (name === "tempMin" && current.tempMax && n > Number(current.tempMax)) {
        return "No puede ser mayor que la máxima.";
      }
      if (name === "tempMax" && current.tempMin && n < Number(current.tempMin)) {
        return "No puede ser menor que la mínima.";
      }
    } else {
      // Humedad
      if (n < 0 || n > 100) {
        return "Debe estar entre 0 y 100.";
      }
      if (name === "humMin" && current.humMax && n > Number(current.humMax)) {
        return "No puede ser mayor que la máxima.";
      }
      if (name === "humMax" && current.humMin && n < Number(current.humMin)) {
        return "No puede ser menor que la mínima.";
      }
    }

    return "";
  };

  /* Cambio simple de campo, aplicando regex de 3 enteros + 3 decimales */
  const handleFieldChange = (name: keyof ThresholdForm, raw: string) => {
    const value = raw.replace(",", ".");
    const isHumidity = name === "humMin" || name === "humMax";
    const regex = isHumidity ? HUM_REGEX : TEMP_REGEX;

    // Permitir vacío para que el usuario pueda borrar
    if (value !== "" && !regex.test(value)) {
      // No actualizamos el valor si rompe el formato básico
      return;
    }

    const nextForm: ThresholdForm = { ...form, [name]: value };

    setForm(nextForm);

    // Validamos todos para mantener coherencia entre min/max
    setFieldErrors({
      tempMin: validateField("tempMin", nextForm.tempMin, nextForm),
      tempMax: validateField("tempMax", nextForm.tempMax, nextForm),
      humMin: validateField("humMin", nextForm.humMin, nextForm),
      humMax: validateField("humMax", nextForm.humMax, nextForm),
    });
  };

  const handleResetDefaults = () => {
    const resetForm: ThresholdForm = {
      tempMin: String(DEFAULTS.tempMin),
      tempMax: String(DEFAULTS.tempMax),
      humMin: String(DEFAULTS.humMin),
      humMax: String(DEFAULTS.humMax),
    };
    setForm(resetForm);
    setFieldErrors(EMPTY_ERRORS);
    showToast("info", "Se restauraron los valores recomendados.");
  };

  /* Carga inicial */
  useEffect(() => {
    if (!isOpen) return;

    if (!deviceId) {
      setError("No se reconoció el dispositivo.");
      return;
    }

    let cancelled = false;

    const fetchThresholds = async () => {
      setLoading(true);
      setError("");
      try {
        const th = await getThresholdByDevEui(deviceId);
        if (cancelled) return;

        const loadedForm = th
          ? buildFormFromApi(th)
          : {
              tempMin: String(DEFAULTS.tempMin),
              tempMax: String(DEFAULTS.tempMax),
              humMin: String(DEFAULTS.humMin),
              humMax: String(DEFAULTS.humMax),
            };

        setForm(loadedForm);
        setFieldErrors(EMPTY_ERRORS);
      } catch (e: any) {
        setForm({
          tempMin: String(DEFAULTS.tempMin),
          tempMax: String(DEFAULTS.tempMax),
          humMin: String(DEFAULTS.humMin),
          humMax: String(DEFAULTS.humMax),
        });
        setFieldErrors(EMPTY_ERRORS);
        setError("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchThresholds();
    return () => {
      cancelled = true;
    };
  }, [isOpen, deviceId]);

  /* Reset al cerrar */
  useEffect(() => {
    if (!isOpen) {
      setError("");
      setLoading(false);
      setSaving(false);
      setFieldErrors(EMPTY_ERRORS);
    }
  }, [isOpen]);

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

      const tempMin = clamp(
        toNum(form.tempMin, DEFAULTS.tempMin),
        -50,
        100
      );
      const tempMax = clamp(
        toNum(form.tempMax, DEFAULTS.tempMax),
        -50,
        100
      );
      const humMin = clamp(
        toNum(form.humMin, DEFAULTS.humMin),
        0,
        100
      );
      const humMax = clamp(
        toNum(form.humMax, DEFAULTS.humMax),
        0,
        100
      );

      await upsertThresholdByDevEui(deviceId, {
        temperature_max: tempMax,
        temperature_min: tempMin,
        humidity_max: humMax,
        humidity_min: humMin,
      });

      showToast("success", "Umbrales guardados correctamente ✅");
      setTimeout(onClose, 900);
    } catch (e: any) {
      showToast("error", "Error al guardar los umbrales.");
    } finally {
      setSaving(false);
    }
  };

  const showGlobalError = !!error && !loading;

  return (
    <>
      {ToastContainer}
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        className=""
        closeOnBackdrop={false}
      >
        <ModalHeader
          title="Umbrales de alerta"
          subtitle="Configura las condiciones que disparan alertas para este sensor."
          onClose={onClose}
          icon={<BellAlertIcon className="w-5 h-5" />}
        />

        {/* Info del dispositivo */}
        <div className="px-1 pb-3 border-b border-gray-100 mb-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 rounded-lg bg-gray-100 p-1.5 text-gray-500">
              <CpuChipIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">
                Dispositivo
              </p>
              <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-gray-400 truncate">
                ID:{" "}
                <span className="font-mono text-[11px] text-gray-500">
                  {displayId}
                </span>
              </p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="px-1 py-4 text-sm text-gray-600">
            Cargando configuración del dispositivo...
          </div>
        )}

        {showGlobalError && !loading && (
          <div className="mx-1 mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <ExclamationTriangleIcon className="w-4 h-4 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {!loading && (
          <div className="px-1 pb-2 space-y-6">
            {/* Temperatura */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                    <FireIcon className="w-3.5 h-3.5" />
                  </span>
                  <h3 className="text-sm font-semibold text-gray-800">
                    Temperatura (°C)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  disabled={saving}
                  className="text-[11px] font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  Restaurar valores recomendados
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Mínima
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.tempMin}
                    disabled={saving}
                    onChange={(e) => handleFieldChange("tempMin", e.target.value)}
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 ${
                      fieldErrors.tempMin
                        ? "border-red-400 focus:ring-red-400"
                        : "border-gray-300 focus:ring-blue-400"
                    }`}
                    placeholder="-50 a 100"
                  />
                  {/* Área de error con altura fija */}
                  <p className="mt-1 h-4 text-[11px] leading-none text-red-500 overflow-hidden text-ellipsis whitespace-nowrap">
                    {fieldErrors.tempMin}
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Máxima
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.tempMax}
                    disabled={saving}
                    onChange={(e) => handleFieldChange("tempMax", e.target.value)}
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 ${
                      fieldErrors.tempMax
                        ? "border-red-400 focus:ring-red-400"
                        : "border-gray-300 focus:ring-blue-400"
                    }`}
                    placeholder="-50 a 100"
                  />
                  <p className="mt-1 h-4 text-[11px] leading-none text-red-500 overflow-hidden text-ellipsis whitespace-nowrap">
                    {fieldErrors.tempMax}
                  </p>
                </div>
              </div>
            </section>

            {/* Humedad */}
            <section className="space-y-3">
              <div className="inline-flex items-center gap-1.5">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                  <CloudIcon className="w-3.5 h-3.5" />
                </span>
                <h3 className="text-sm font-semibold text-gray-800">
                  Humedad (%RH)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Mínima
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.humMin}
                    disabled={saving}
                    onChange={(e) => handleFieldChange("humMin", e.target.value)}
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 ${
                      fieldErrors.humMin
                        ? "border-red-400 focus:ring-red-400"
                        : "border-gray-300 focus:ring-blue-400"
                    }`}
                    placeholder="0 a 100"
                  />
                  <p className="mt-1 h-4 text-[11px] leading-none text-red-500 overflow-hidden text-ellipsis whitespace-nowrap">
                    {fieldErrors.humMin}
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Máxima
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.humMax}
                    disabled={saving}
                    onChange={(e) => handleFieldChange("humMax", e.target.value)}
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 ${
                      fieldErrors.humMax
                        ? "border-red-400 focus:ring-red-400"
                        : "border-gray-300 focus:ring-blue-400"
                    }`}
                    placeholder="0 a 100"
                  />
                  <p className="mt-1 h-4 text-[11px] leading-none text-red-500 overflow-hidden text-ellipsis whitespace-nowrap">
                    {fieldErrors.humMax}
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        <ModalFooter
          onCancel={onClose}
          onConfirm={handleSave}
          isLoading={saving}
          confirmDisabled={!isValid || saving || loading || !deviceId}
          confirmLabel="Guardar umbrales"
        />
      </BaseModal>
    </>
  );
};

export default AlertThresholdModal;
