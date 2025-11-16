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

/* =========================
   Helpers numéricos
========================= */
const toNum = (v: unknown, fb: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

/* Valores recomendados por defecto */
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

  /* =========================
     Validaciones derivadas
  ========================== */
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

  /* =========================
     Carga de datos al abrir
  ========================== */
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
          // No hay configuración previa → defaults
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
        // Si hay error de API usamos defaults pero sin asustar al usuario
        setForm({
          tempMin: DEFAULTS.tempMin,
          tempMax: DEFAULTS.tempMax,
          humMin: DEFAULTS.humMin,
          humMax: DEFAULTS.humMax,
        });
        // puedes loguear internamente, aquí solo damos mensaje suave opcional
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

  /* Reset suave al cerrar (opcional pero lo deja "limpio") */
  useEffect(() => {
    if (!isOpen) {
      setError("");
      setLoading(false);
      setSaving(false);
    }
  }, [isOpen]);

  /* =========================
     Handlers de cambio
  ========================== */
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

  /* =========================
     Guardar en API (upsert)
  ========================== */
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

  /* =========================
     Render
  ========================== */
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

        {/* Estado carga / error */}
        {loading && (
          <div className="p-4 text-sm text-gray-600">
            Cargando configuración del dispositivo...
          </div>
        )}

        {showGlobalError && (
          <div className="mx-4 mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {error}
          </div>
        )}

        {!loading && (
          <div className="px-4 pb-4 pt-1 space-y-5">
            {/* Resumen actual */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs sm:text-sm text-gray-600 flex flex-wrap gap-2 justify-between">
              <div>
                <span className="font-semibold text-gray-800">
                  Rango de temperatura:
                </span>{" "}
                {form.tempMin.toFixed(1)}°C – {form.tempMax.toFixed(1)}°C
              </div>
              <div>
                <span className="font-semibold text-gray-800">
                  Rango de humedad:
                </span>{" "}
                {form.humMin.toFixed(1)}% – {form.humMax.toFixed(1)}%
              </div>
            </div>

            {/* Temperatura */}
            <section className="border border-gray-200 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <h3 className="font-semibold text-gray-800 text-base sm:text-lg">
                  Temperatura (°C)
                </h3>
                <span className="text-[11px] sm:text-xs text-gray-500">
                  Rango recomendado: {DEFAULTS.tempMin}–{DEFAULTS.tempMax}°C
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Mínima
                  </label>
                  <input
                    type="number"
                    value={form.tempMin}
                    min={-50}
                    max={form.tempMax}
                    disabled={saving}
                    onChange={(e) => handleMinTemp(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 sm:p-2.5 text-sm focus:ring-2 outline-none ${
                      form.tempMin > form.tempMax
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/70"
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    No debe ser mayor que la temperatura máxima.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Máxima
                  </label>
                  <input
                    type="number"
                    value={form.tempMax}
                    min={form.tempMin}
                    max={100}
                    disabled={saving}
                    onChange={(e) => handleMaxTemp(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 sm:p-2.5 text-sm focus:ring-2 outline-none ${
                      form.tempMax < form.tempMin
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/70"
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    No debe ser menor que la temperatura mínima.
                  </p>
                </div>
              </div>
            </section>

            {/* Humedad */}
            <section className="border border-gray-200 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <h3 className="font-semibold text-gray-800 text-base sm:text-lg">
                  Humedad (%RH)
                </h3>
                <span className="text-[11px] sm:text-xs text-gray-500">
                  Rango recomendado: {DEFAULTS.humMin}–{DEFAULTS.humMax}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Mínima
                  </label>
                  <input
                    type="number"
                    value={form.humMin}
                    min={0}
                    max={form.humMax}
                    disabled={saving}
                    onChange={(e) => handleMinHum(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 sm:p-2.5 text-sm focus:ring-2 outline-none ${
                      form.humMin > form.humMax
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/70"
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    No debe ser mayor que la humedad máxima.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Máxima
                  </label>
                  <input
                    type="number"
                    value={form.humMax}
                    min={form.humMin}
                    max={100}
                    disabled={saving}
                    onChange={(e) => handleMaxHum(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 sm:p-2.5 text-sm focus:ring-2 outline-none ${
                      form.humMax < form.humMin
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/70"
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    No debe ser menor que la humedad mínima.
                  </p>
                </div>
              </div>
            </section>
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
