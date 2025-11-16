/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/solid";
import type { UINotification } from "../../context/NotificationsContext";

interface Props {
  open: boolean;
  onClose: () => void;
  data: UINotification | null;
  onMarkRead?: (id: number) => Promise<void> | void;
  onFilterBySensor?: (uid: string) => void;
}

/** Clases para el pill según tipo de notificación */
const KIND_PILL: Record<UINotification["kind"], string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
  success: "bg-green-50 text-green-700 border-green-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  other: "bg-gray-50 text-gray-700 border-gray-200",
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const NotificationDetailModal: React.FC<Props> = ({
  open,
  onClose,
  data,
  onMarkRead,
  onFilterBySensor,
}) => {
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Evitar problemas con SSR / portal antes de que exista document
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lock de scroll cuando el modal está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Foco inicial en el panel al abrir
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 10);
    return () => window.clearTimeout(id);
  }, [open]);

  // Si no hay data o aún no está montado el portal, no renderizamos nada
  if (!mounted || !open || !data) return null;

  const handleMark = async () => {
    if (!onMarkRead) return;
    setPending(true);
    try {
      await onMarkRead(data.id);
    } finally {
      setPending(false);
    }
  };

  const pillClass = KIND_PILL[data.kind] ?? KIND_PILL.other;

  // Nombre legible de sensor, viene de UINotification
  const sensorLabel = data.sensorLabel ?? data.sensor_uid ?? "—";

  const panel = (
    <div className="fixed inset-0 z-[90]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel lateral derecho */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de notificación"
        className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl p-6 overflow-y-auto outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Detalle de notificación
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <XMarkIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Contenido */}
        <div className="space-y-4">
          {/* Tipo + tiempo */}
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full border text-xs font-medium capitalize ${pillClass}`}
            >
              {data.kind}
            </span>
            <span className="text-xs text-gray-500">{data.timeago}</span>
          </div>

          {/* Mensaje */}
          <div className="text-base font-medium text-gray-900 whitespace-pre-line">
            {data.message}
          </div>

          {/* Datos principales */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg border bg-gray-50">
              <div className="text-gray-500">Leída</div>
              <div className="font-semibold">{data.is_read ? "Sí" : "No"}</div>
            </div>

            <div className="p-3 rounded-lg border bg-gray-50">
              <div className="text-gray-500">Fecha</div>
              <div className="font-semibold">
                {formatDateTime(data.created_at)}
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-gray-50">
              <div className="text-gray-500">Valor</div>
              <div className="font-semibold">{data.value ?? "—"}</div>
            </div>

            <div className="p-3 rounded-lg border bg-gray-50">
              <div className="text-gray-500">Rango</div>
              <div className="font-semibold">
                {data.threshold_min ?? "—"} / {data.threshold_max ?? "—"}
              </div>
            </div>

            {/* Sensor */}
            <div className="p-3 rounded-lg border bg-gray-50 col-span-2">
              <div className="text-gray-500">Sensor</div>
              <div className="font-semibold text-gray-900">
                {sensorLabel}
              </div>
              {data.sensor_uid && (
                <div className="mt-1 text-[11px] text-gray-500 font-mono break-all">
                  UID: {data.sensor_uid}
                </div>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {!data.is_read && (
              <button
                onClick={handleMark}
                disabled={pending}
                className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${
                  pending
                    ? "bg-blue-400 cursor-wait"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {pending ? "Marcando…" : "Marcar como leída"}
              </button>
            )}

            {data.sensor_uid && onFilterBySensor && (
              <button
                onClick={() => onFilterBySensor(data.sensor_uid!)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
              >
                Ver por sensor
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
};

export default NotificationDetailModal;
