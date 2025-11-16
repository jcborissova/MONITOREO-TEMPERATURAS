/* eslint-disable @typescript-eslint/no-unused-vars */
// src/hooks/useNotifications.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import {
  useNotificationsContext,
  type NotificationsContextValue,
} from "../context/NotificationsContext";

/**
 * Hook principal de notificaciones.
 * La opción pollMs se ignora (el polling está centralizado en el provider),
 * pero la dejo en la firma para no romper llamadas existentes.
 */
export const useNotifications = (
  _opts?: { pollMs?: number }
): Pick<
  NotificationsContextValue,
  | "all"
  | "loading"
  | "error"
  | "unreadCount"
  | "pendingAll"
  | "pendingMap"
  | "sensorOptions"
  | "sensorLabelById"
  | "markOne"
  | "markAll"
  | "reload"
> => {
  const ctx = useNotificationsContext();
  return {
    all: ctx.all,
    loading: ctx.loading,
    error: ctx.error,
    unreadCount: ctx.unreadCount,
    pendingAll: ctx.pendingAll,
    pendingMap: ctx.pendingMap,
    sensorOptions: ctx.sensorOptions,
    sensorLabelById: ctx.sensorLabelById,
    markOne: ctx.markOne,
    markAll: ctx.markAll,
    reload: ctx.reload,
  };
};

/** Mapa de pendientes (por id) */
export const usePendingMap = () => {
  const ctx = useNotificationsContext();
  return ctx.pendingMap;
};

/**
 * Compatibilidad: listado de sensor_uids presentes en notificaciones.
 * (Ahora deriva de ctx.sensorOptions.)
 */
export const useSensors = () => {
  const ctx = useNotificationsContext();
  return useMemo(() => ctx.sensorOptions.map((s) => s.id), [ctx.sensorOptions]);
};
