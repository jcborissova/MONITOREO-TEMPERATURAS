/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/solid";
import type { Notification } from "../../utils/notifications";

interface Props {
  open: boolean;
  onClose: () => void;
  data: Notification | null;
  onMarkRead?: (id: number) => Promise<void> | void;
  onFilterBySensor?: (uid: string) => void;
}

const NotificationDetailModal: React.FC<Props> = ({
  open,
  onClose,
  data,
  onMarkRead,
  onFilterBySensor,
}) => {
  const [pending, setPending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && panelRef.current) panelRef.current.focus();
  }, [open]);

  if (!open || !data) return null;

  const handleMark = async () => {
    setPending(true);
    try {
      await onMarkRead?.(data.id);
    } finally {
      setPending(false);
    }
  };

  const pill =
    data.kind === "critical"
      ? "bg-red-50 text-red-700 border-red-200"
      : data.kind === "warning"
      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
      : data.kind === "success"
      ? "bg-green-50 text-green-700 border-green-200"
      : data.kind === "info"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  const panel = (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl p-6 overflow-y-auto outline-none"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Detalle de notificación
          </h2>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100" aria-label="Cerrar">
            <XMarkIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${pill}`}>
              {data.kind}
            </span>
            <span className="text-xs text-gray-500">{data.timeago}</span>
          </div>

          <div className="text-base font-medium text-gray-900">{data.message}</div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg border bg-gray-50">
              <div className="text-gray-500">Leída</div>
              <div className="font-semibold">{data.is_read ? "Sí" : "No"}</div>
            </div>
            <div className="p-3 rounded-lg border bg-gray-50">
              <div className="text-gray-500">Fecha</div>
              <div className="font-semibold">{new Date(data.created_at).toLocaleString()}</div>
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
            <div className="p-3 rounded-lg border bg-gray-50 col-span-2">
              <div className="text-gray-500">Sensor UID</div>
              <div className="font-mono text-xs break-all">
                {data.sensor_uid || "—"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            {!data.is_read && (
              <button
                onClick={handleMark}
                disabled={pending}
                className={`px-4 py-2 rounded-lg text-white ${
                  pending ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {pending ? "Marcando…" : "Marcar como leída"}
              </button>
            )}
            {data.sensor_uid && (
              <button
                onClick={() => {
                  // guard: asegurar string, evitar error TS (string | null)
                  if (!data.sensor_uid) return;
                  onFilterBySensor?.(data.sensor_uid);
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
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
