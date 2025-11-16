/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from "react";
import BaseModal from "../ui/BaseModal";
import ModalHeader from "../ui/ModalHeader";
import ModalFooter from "../ui/ModalFooter";
import { useToast } from "../../hooks/useToast";
import {
  getThresholdByDevEui,
  upsertThresholdByDevEui,
} from "../../services/thresholds.service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** dev_eui o identificador único resoluble en API */
  deviceId: string;
  /** Nombre legible del sensor (opcional). Si no viene, usamos el deviceId. */
  deviceLabel?: string;
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

  /* Reset suave al cerrar */
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
     Acciones
  ========================== */
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

  /* =========================
     Render
  ========================== */
  return (
    <>
      {ToastContainer}
      <BaseModal isOpen={isOpen} onClose={onClose}>
        <ModalHeader title="Umbrales de alerta" onClose={onClose} />

        {/* Cabecera compacta del dispositivo */}
        <div className="px-4 pt-1 pb-3 border-b border-slate-100">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            Dispositivo
          </p>
          <p className="text-sm sm:text-base font-medium text-slate-900 truncate">
            {displayName}
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            ID:{" "}
            <span className="font-mono text-[11px] text-slate-500">
              {displayId}
            </span>
          </p>
        </div>

        {/* Estado carga / error */}
        {loading && (
          <div className="px-4 py-4 text-sm text-gray-600">
            Cargando configuración del dispositivo...
          </div>
        )}

        {showGlobalError && !loading && (
          <div className="mx-4 mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {error}
          </div>
        )}

        {!loading && (
          <div className="px-4 pb-4 pt-3 space-y-6">
            {/* Temperatura */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-800">
                  Temperatura (°C)
                </h3>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  disabled={saving}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
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
                        : "border-slate-300 focus:ring-slate-400"
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
                        : "border-slate-300 focus:ring-slate-400"
                    }`}
                  />
                </div>
              </div>
            </section>

            {/* Humedad */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">
                Humedad (%RH)
              </h3>

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
                        : "border-slate-300 focus:ring-slate-400"
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
                        : "border-slate-300 focus:ring-slate-400"
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
          confirmDisabled={!isValid || saving || loading || !deviceId}
          isLoading={saving}
        />
      </BaseModal>
    </>
  );
};

export default AlertThresholdModal;
