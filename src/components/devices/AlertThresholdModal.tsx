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

/* Helpers numéricos */
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

type ThresholdForm = {
  tempMin: number;
  tempMax: number;
  humMin: number;
  humMax: number;
};

const buildFormFromApi = (th: any | null | undefined): ThresholdForm => ({
  tempMin: toNum(th?.temperature_min, DEFAULTS.tempMin),
  tempMax: toNum(th?.temperature_max, DEFAULTS.tempMax),
  humMin: toNum(th?.humidity_min, DEFAULTS.humMin),
  humMax: toNum(th?.humidity_max, DEFAULTS.humMax),
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
    tempMin: DEFAULTS.tempMin,
    tempMax: DEFAULTS.tempMax,
    humMin: DEFAULTS.humMin,
    humMax: DEFAULTS.humMax,
  });

  const displayName = deviceLabel || deviceId || "Sensor sin nombre";
  const displayId = deviceId || "ID no disponible";

  const isValid = useMemo(() => {
    const { tempMin, tempMax, humMin, humMax } = form;
    const tOk =
      tempMin <= tempMax &&
      tempMin >= -50 &&
      tempMax <= 100;
    const hOk =
      humMin <= humMax &&
      humMin >= 0 &&
      humMax <= 100;
    return tOk && hOk;
  }, [form]);

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

        if (!th) {
          setForm({
            tempMin: DEFAULTS.tempMin,
            tempMax: DEFAULTS.tempMax,
            humMin: DEFAULTS.humMin,
            humMax: DEFAULTS.humMax,
          });
        } else {
          setForm(buildFormFromApi(th));
        }
      } catch (e: any) {
        setForm({
          tempMin: DEFAULTS.tempMin,
          tempMax: DEFAULTS.tempMax,
          humMin: DEFAULTS.humMin,
          humMax: DEFAULTS.humMax,
        });
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
    }
  }, [isOpen]);

  const updateFormField = (
    field: keyof ThresholdForm,
    value: number,
    opts?: { against?: keyof ThresholdForm; type?: "min" | "max"; label?: string }
  ) => {
    setForm((prev) => {
      const next: ThresholdForm = { ...prev, [field]: value };

      if (opts?.against && opts.type) {
        const other = prev[opts.against];

        if (opts.type === "min" && value > other) {
          showToast(
            "error",
            `${opts.label ?? "El valor mínimo"} no puede ser mayor que el máximo.`
          );
          return prev;
        }
        if (opts.type === "max" && value < other) {
          showToast(
            "error",
            `${opts.label ?? "El valor máximo"} no puede ser menor que el mínimo.`
          );
          return prev;
        }
      }

      return next;
    });
  };

  const handleMinTemp = (v: number) =>
    updateFormField("tempMin", v, {
      against: "tempMax",
      type: "min",
      label: "La temperatura mínima",
    });

  const handleMaxTemp = (v: number) =>
    updateFormField("tempMax", v, {
      against: "tempMin",
      type: "max",
      label: "La temperatura máxima",
    });

  const handleMinHum = (v: number) =>
    updateFormField("humMin", v, {
      against: "humMax",
      type: "min",
      label: "La humedad mínima",
    });

  const handleMaxHum = (v: number) =>
    updateFormField("humMax", v, {
      against: "humMin",
      type: "max",
      label: "La humedad máxima",
    });

  const handleResetDefaults = () => {
    setForm({
      tempMin: DEFAULTS.tempMin,
      tempMax: DEFAULTS.tempMax,
      humMin: DEFAULTS.humMin,
      humMax: DEFAULTS.humMax,
    });
    showToast("info", "Se restauraron los valores recomendados.");
  };

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
        temperature_max: clamp(
          toNum(form.tempMax, DEFAULTS.tempMax),
          -50,
          100
        ),
        temperature_min: clamp(
          toNum(form.tempMin, DEFAULTS.tempMin),
          -50,
          100
        ),
        humidity_max: clamp(
          toNum(form.humMax, DEFAULTS.humMax),
          0,
          100
        ),
        humidity_min: clamp(
          toNum(form.humMin, DEFAULTS.humMin),
          0,
          100
        ),
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
        closeOnBackdrop={false} // 👈 IMPORTANTE: no cerrar al hacer click afuera
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
                    type="number"
                    value={form.tempMin}
                    min={-50}
                    max={form.tempMax}
                    disabled={saving}
                    onChange={(e) => handleMinTemp(Number(e.target.value))}
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 ${
                      form.tempMin > form.tempMax
                        ? "border-red-400 focus:ring-red-400"
                        : "border-gray-300 focus:ring-blue-400"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Máxima
                  </label>
                  <input
                    type="number"
                    value={form.tempMax}
                    min={form.tempMin}
                    max={100}
                    disabled={saving}
                    onChange={(e) => handleMaxTemp(Number(e.target.value))}
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 ${
                      form.tempMax < form.tempMin
                        ? "border-red-400 focus:ring-red-400"
                        : "border-gray-300 focus:ring-blue-400"
                    }`}
                  />
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
                    type="number"
                    value={form.humMin}
                    min={0}
                    max={form.humMax}
                    disabled={saving}
                    onChange={(e) => handleMinHum(Number(e.target.value))}
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 ${
                      form.humMin > form.humMax
                        ? "border-red-400 focus:ring-red-400"
                        : "border-gray-300 focus:ring-blue-400"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Máxima
                  </label>
                  <input
                    type="number"
                    value={form.humMax}
                    min={form.humMin}
                    max={100}
                    disabled={saving}
                    onChange={(e) => handleMaxHum(Number(e.target.value))}
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 ${
                      form.humMax < form.humMin
                        ? "border-red-400 focus:ring-red-400"
                        : "border-gray-300 focus:ring-blue-400"
                    }`}
                  />
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
