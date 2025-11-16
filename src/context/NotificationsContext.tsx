// src/context/NotificationsContext.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  useNotificationsStore,
  selectors,
  type NotificationsState,
} from "../store/notifications.store";
import { toNotification, type Notification } from "../utils/notifications";
import type { Room } from "../types/types";
import { SensorsContext } from "./SensorsContext";

type PendingMap = Record<number, boolean>;

export interface SensorOption {
  id: string;
  label: string;
}

export interface UINotification extends Notification {
  /** Nombre legible derivado del sensor (Room.name) */
  sensorLabel?: string;
  /** Room completo si existe */
  sensorRoom?: Room | null;
}

interface NotificationsContextValue {
  all: UINotification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;

  pendingAll: boolean;
  pendingMap: PendingMap;

  /** Sensores únicos presentes en notificaciones, ya con label amigable */
  sensorOptions: SensorOption[];
  /** Mapa rápido sensor_uid -> label amigable */
  sensorLabelById: Record<string, string>;

  markOne: (id: number) => Promise<void>;
  markAll: () => Promise<void>;
  reload: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Zustand store base
  const rawItems = useNotificationsStore(selectors.all);
  const loading = useNotificationsStore(selectors.loading);
  const pendingAll = useNotificationsStore(selectors.pendingAll);
  const pendingIds = useNotificationsStore(selectors.pendingIds);
  const error = useNotificationsStore((s: NotificationsState) => s.error);
  const load = useNotificationsStore((s: NotificationsState) => s.load);
  const markOneFromStore = useNotificationsStore((s: NotificationsState) => s.markOne);
  const markAllFromStore = useNotificationsStore((s: NotificationsState) => s.markAll);

  // Sensores desde SensorsContext (enriquecidos con conexión, etc.)
  const { sensors: rooms } = useContext(SensorsContext);

  // Mapa devEUI/name -> info (label + room)
  const sensorInfoById = useMemo(() => {
    const map: Record<string, { label: string; room: Room }> = {};
    for (const room of rooms) {
      const devEui = (room as any).devEUI ?? (room as any).name;
      if (!devEui) continue;
      const key = String(devEui);
      // nombre legible
      const label = (room as any).name ?? key;
      if (!map[key]) {
        map[key] = { label, room };
      }
    }
    return map;
  }, [rooms]);

  // Normalizamos a Notification base (kind/timeago)
  const baseNotifications = useMemo<Notification[]>(() => {
    return rawItems.map(toNotification);
  }, [rawItems]);

  // Enriquecemos con sensorLabel y sensorRoom
  const all = useMemo<UINotification[]>(() => {
    return baseNotifications.map((n) => {
      const uid = n.sensor_uid ?? "";
      const info = uid ? sensorInfoById[uid] : undefined;
      return {
        ...n,
        sensorLabel: info?.label ?? (uid || undefined),
        sensorRoom: info?.room ?? null,
      };
    });
  }, [baseNotifications, sensorInfoById]);

  const unreadCount = useMemo(() => all.filter((n) => !n.is_read).length, [all]);

  const pendingMap = useMemo<PendingMap>(() => ({ ...pendingIds }), [pendingIds]);

  // Opciones de sensores para filtros (solo sensores que aparecen en notificaciones)
  const sensorOptions = useMemo<SensorOption[]>(() => {
    const seen = new Set<string>();
    const opts: SensorOption[] = [];
    for (const n of baseNotifications) {
      const uid = n.sensor_uid;
      if (!uid) continue;
      if (seen.has(uid)) continue;
      seen.add(uid);
      const info = sensorInfoById[uid];
      opts.push({
        id: uid,
        label: info?.label ?? uid,
      });
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [baseNotifications, sensorInfoById]);

  // Mapa rápido uid -> label
  const sensorLabelById = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const opt of sensorOptions) {
      map[opt.id] = opt.label;
    }
    return map;
  }, [sensorOptions]);

  const reload = useCallback(async () => {
    await load();
  }, [load]);

  // Polling global (20s, un solo lugar)
  const POLL_MS = 20_000;
  const firstLoadRef = useRef(false);

  useEffect(() => {
    if (!firstLoadRef.current) {
      firstLoadRef.current = true;
      void load();
    }
    const id = window.setInterval(() => {
      void load();
    }, POLL_MS);

    return () => {
      window.clearInterval(id);
    };
  }, [load, POLL_MS]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      all,
      loading,
      error,
      unreadCount,
      pendingAll,
      pendingMap,
      sensorOptions,
      sensorLabelById,
      markOne: markOneFromStore,
      markAll: markAllFromStore,
      reload,
    }),
    [
      all,
      loading,
      error,
      unreadCount,
      pendingAll,
      pendingMap,
      sensorOptions,
      sensorLabelById,
      markOneFromStore,
      markAllFromStore,
      reload,
    ]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotificationsContext = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotificationsContext debe usarse dentro de <NotificationsProvider>");
  }
  return ctx;
};

export type { NotificationsContextValue };
