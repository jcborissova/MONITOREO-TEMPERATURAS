/* src/components/DeviceDetailsModal.tsx */
"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useMemo, useRef } from "react";
import {
  XMarkIcon,
  InformationCircleIcon,
  CubeTransparentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  SignalSlashIcon,
  CalendarDaysIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import type { Room } from "../../types/types";

/* =========================
   Helpers
========================= */
const toMs = (v: any): number => {
  if (!v) return 0;
  const d =
    typeof v === "number"
      ? new Date(v < 9_999_999_999 ? v * 1000 : v)
      : typeof v === "string"
      ? new Date(v.includes(" ") ? v.replace(" ", "T") : v)
      : new Date(v);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const fmtNum = (v: number | null | undefined, suffix = "") =>
  v == null || Number.isNaN(Number(v)) ? "—" : `${Number(v).toFixed(1)}${suffix}`;

const fmtDateTime = (v: any) => {
  const ms = toMs(v);
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString("es-DO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
};

const timeAgo = (v: any) => {
  const ms = toMs(v);
  if (!ms) return "";
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
};

const isConnected = (updatedAt: any, minutes = 5) => {
  const ms = toMs(updatedAt);
  return ms && Date.now() - ms <= minutes * 60 * 1000;
};

/* =========================
   UI bits
========================= */
const Tile = ({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "default" | "green" | "red" | "yellow" | "blue";
}) => {
  const toneCls =
    tone === "green"
      ? "text-green-600"
      : tone === "red"
      ? "text-red-600"
      : tone === "yellow"
      ? "text-yellow-600"
      : tone === "blue"
      ? "text-sky-600"
      : "text-gray-800";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] leading-none text-gray-500">{label}</p>
        <p className={`truncate text-base font-semibold ${toneCls}`}>{value}</p>
      </div>
    </div>
  );
};

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
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  const onBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  /* ==== Derivados ==== */
  const lastUpdate = device?.updatedAt ?? device?.timestamp ?? null;
  const connected = isConnected(lastUpdate, 5);
  const temp = device?.temperature as number | undefined;
  const hum = (device as any)?.humedity ?? (device as any)?.humidity;
  const uid = device?.devEUI ?? (device as any)?.uid ?? (device as any)?.id ?? "—";

  const history = useMemo(() => {
    const list = (device?.history ?? [])
      .slice(-30)
      .map((h) => ({
        ts: toMs(h.timestamp ?? (h as any).created_at ?? (h as any).time),
        temperature:
          typeof h.temperature === "number" ? h.temperature : (h as any)?.temp,
        humedity:
          typeof h.humedity === "number"
            ? h.humedity
            : (h as any)?.humidity ?? (h as any)?.hum,
      }))
      .filter((x) => x.ts > 0)
      .sort((a, b) => b.ts - a.ts);
    return list;
  }, [device?.history]);

  const imageSrc =
    device?.imageUrl && device.imageUrl.trim().length > 0 ? device.imageUrl : "";

  return (
    <>
      {isOpen && (
        <div
          ref={backdropRef}
          onMouseDown={onBackdrop}
          className="
            fixed inset-0 z-[10000]
            bg-black/45 backdrop-blur-[2px]
            flex items-end sm:items-center justify-center
            px-0 sm:px-4
          "
          role="dialog"
          aria-modal="true"
          aria-label="Detalles del dispositivo"
        >
          <div
            className="
              relative w-full sm:max-w-xl lg:max-w-2xl
              max-h-[88dvh]
              rounded-t-2xl sm:rounded-2xl lg:rounded-3xl
              border border-gray-100 bg-white 
              shadow-[0_18px_44px_-14px_rgba(0,0,0,0.25)]
              ring-1 ring-black/5
              flex flex-col
              overflow-hidden
              pb-[env(safe-area-inset-bottom)]
            "
          >
            {/* ===== HEADER (sticky) ===== */}
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur">
              <div className="sm:hidden flex items-center justify-center pt-2">
                <div className="h-1.5 w-12 rounded-full bg-gray-300" />
              </div>

              <div className="relative px-3 sm:px-5 py-3">
                <button
                  onClick={onClose}
                  className="absolute right-2 top-2 inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-50 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  aria-label="Cerrar"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>

                <div className="flex items-start gap-3 pr-10">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={device?.name ?? "Dispositivo"}
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg border border-gray-100 object-cover shadow"
                    />
                  ) : (
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                      <CubeTransparentIcon className="h-6 w-6 sm:h-7 sm:w-7 text-gray-400" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <InformationCircleIcon className="h-5 w-5 text-blue-600" />
                      <h2 className="truncate text-base sm:text-lg font-semibold text-gray-900">
                        {device?.name ?? "Zona / Dispositivo"}
                      </h2>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] sm:text-xs text-gray-700">
                        <IdentificationIcon className="h-4 w-4 text-gray-500" />
                        UID: <span className="font-medium text-gray-900">{uid}</span>
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] sm:text-xs font-medium ${
                          connected
                            ? "border border-green-200 bg-green-50 text-green-700"
                            : "border border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {connected ? (
                          <SignalIcon className="h-4 w-4" />
                        ) : (
                          <SignalSlashIcon className="h-4 w-4" />
                        )}
                        {connected ? "Conectado" : "Desconectado"}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] sm:text-xs text-gray-700">
                        <CalendarDaysIcon className="h-4 w-4 text-gray-500" />
                        {fmtDateTime(lastUpdate)}
                        <span className="text-gray-400">({timeAgo(lastUpdate)})</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== BODY con scroll propio ===== */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-5 py-3 max-h-[74dvh]">
              {/* Tiles métricas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Tile
                  icon={<CheckCircleIcon className="h-5 w-5" />}
                  label="Zona"
                  value={device?.name ?? "—"}
                />
                <Tile
                  icon={<ExclamationTriangleIcon className="h-5 w-5" />}
                  label="Temperatura"
                  value={fmtNum(temp, " °C")}
                  tone="blue"
                />
                <Tile
                  icon={<ExclamationTriangleIcon className="h-5 w-5" />}
                  label="Humedad"
                  value={fmtNum(typeof hum === "number" ? hum : undefined, " %")}
                  tone="yellow"
                />
              </div>

              {/* Detalle textual */}
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <p className="leading-relaxed">
                  <span className="font-medium text-gray-900">Estado:</span>{" "}
                  {connected ? (
                    <span className="text-green-700">Operativo</span>
                  ) : (
                    <span className="text-red-700">Sin conexión reciente</span>
                  )}
                </p>
              </div>

              {/* Historial */}
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-800">
                  Historial reciente
                </h3>

                {/* Vista móvil: tarjetas (más legible) */}
                <div className="grid grid-cols-1 gap-2 sm:hidden">
                  {history.length ? (
                    history.map((row, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-gray-200 bg-white p-3 text-sm flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">
                            {fmtDateTime(row.ts)}
                          </p>
                          <p className="text-xs text-gray-500">{timeAgo(row.ts)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-700">
                            T: <span className="font-semibold">{fmtNum(row.temperature)}</span>
                          </p>
                          <p className="text-gray-700">
                            H: <span className="font-semibold">{fmtNum(row.humedity)}</span>
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-gray-300 bg-white py-3 text-center text-sm text-gray-500">
                      No hay registros históricos disponibles.
                    </p>
                  )}
                </div>

                {/* Vista ≥ sm: tabla compacta */}
                {history.length ? (
                  <div className="hidden sm:block rounded-xl border border-gray-200 max-h-56 lg:max-h-64 overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 bg-gray-100/90 backdrop-blur text-gray-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Fecha</th>
                          <th className="px-3 py-2 text-right">Temp (°C)</th>
                          <th className="px-3 py-2 text-right">Humedad (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {history.map((row, i) => (
                          <tr key={i} className={i % 2 ? "bg-white" : "bg-gray-50/60"}>
                            <td className="px-3 py-2">
                              {fmtDateTime(row.ts)}
                              <span className="ml-1 text-xs text-gray-400">
                                ({timeAgo(row.ts)})
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {fmtNum(
                                typeof row.temperature === "number"
                                  ? row.temperature
                                  : undefined,
                                ""
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {fmtNum(
                                typeof row.humedity === "number"
                                  ? row.humedity
                                  : undefined,
                                ""
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>

            {/* ===== FOOTER ===== */}
            <div className="sticky bottom-0 border-t border-gray-100 bg-white/95 backdrop-blur px-3 sm:px-5 py-3">
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <button
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeviceDetailsModal;
