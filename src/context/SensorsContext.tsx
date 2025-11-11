/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useEffect, useState, type ReactNode } from "react";
import type { Room, Measure } from "../types/types";
import { sensorsService } from "../services/sensors.service";
import { getAllThresholdsMap, type SensorThreshold } from "../services/thresholds.service";
import { registerCache } from "../services/cacheRegistry";

/* =========================
   Tipos/constantes de conexión
========================= */
export type ConnInfo = {
  isConnected: boolean;
  last: Date | null;
  diffMin: number;
  status?: string;             // eco del API
  apiSaysConnected: boolean;   // bandera informativa
  recentByTime: boolean;       // bandera real por tiempo
};

/** Umbral unificado de “en vivo” */
export const CONNECTION_THRESHOLD_MIN = 30;

/* ============ utils de tiempo ============ */
const toMs = (v: any): number => {
  if (!v && v !== 0) return 0;
  const d =
    typeof v === "number"
      ? new Date(v < 9_999_999_999 ? v * 1000 : v)
      : typeof v === "string"
      ? new Date(v.includes(" ") ? v.replace(" ", "T") : v)
      : new Date(v);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const latestHistoryTs = (hist?: Measure[]): number => {
  if (!Array.isArray(hist) || hist.length === 0) return 0;
  let max = 0;
  for (const h of hist) {
    const ms = toMs(
      (h as any).timestamp ??
        (h as any).date ??
        (h as any).created_at ??
        (h as any).time ??
        (h as any).updatedAt
    );
    if (ms > max) max = ms;
  }
  return max;
};

/** 
 * Regla unificada:
 *  - La conectividad REAL depende SOLO de la recencia de la última lectura (recentByTime).
 *  - El status del API se conserva sólo como dato informativo (no vuelve “online” si está viejo).
 */
const computeConnectionFromMs = (
  latestMs: number,
  status?: string,
  thresholdMin = CONNECTION_THRESHOLD_MIN
): ConnInfo => {
  const apiSaysConnected = (status ?? "").toLowerCase() === "conectado";
  const recentByTime = latestMs ? Date.now() - latestMs <= thresholdMin * 60_000 : false;

  return {
    isConnected: recentByTime,
    last: latestMs ? new Date(latestMs) : null,
    diffMin: latestMs ? (Date.now() - latestMs) / 60_000 : Infinity,
    status,
    apiSaysConnected,
    recentByTime,
  };
};

/* ============ context ============ */
interface SensorsContextProps {
  sensors: Room[];
  thresholdsByDevEui: Record<string, SensorThreshold>;
  getConnection: (idOrRoom: string | Room) => ConnInfo;
  getSmartConnection: (idOrRoom: string | Room, historyOverride?: Measure[]) => ConnInfo;
  refreshSensors: () => Promise<void>;
}

export const SensorsContext = createContext<SensorsContextProps>({
  sensors: [],
  thresholdsByDevEui: {},
  getConnection: () => ({
    isConnected: false,
    last: null,
    diffMin: Infinity,
    status: undefined,
    apiSaysConnected: false,
    recentByTime: false,
  }),
  getSmartConnection: () => ({
    isConnected: false,
    last: null,
    diffMin: Infinity,
    status: undefined,
    apiSaysConnected: false,
    recentByTime: false,
  }),
  refreshSensors: async () => {},
});

export const SensorsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sensors, setSensors] = useState<Room[]>([]);
  const [thresholdsByDevEui, setThresholdsByDevEui] = useState<Record<string, SensorThreshold>>({});

  const isMounted = React.useRef(true);
  const hasFetched = React.useRef(false);

  const enrichRooms = (list: Room[]) =>
    list.map((s) => {
      const up = toMs((s as any).updatedAt ?? (s as any).timestamp);
      const conn = computeConnectionFromMs(up, (s as any).status);
      return {
        ...s,
        isConnected: conn.isConnected,
        lastSeen: conn.last ? conn.last.toISOString() : undefined,
        diffMin: conn.diffMin,
      } as Room;
    });

  const fetchSensors = async () => {
    try {
      const [rawSensors, thMap] = await Promise.all([
        sensorsService.getAllSensors(),
        getAllThresholdsMap().catch(() => ({} as Record<string, SensorThreshold>)),
      ]);
      if (!Array.isArray(rawSensors)) return;

      const list = enrichRooms(rawSensors);
      if (!isMounted.current) return;
      setSensors(list);
      setThresholdsByDevEui(thMap);
    } catch (e) {
      console.error("Error obteniendo sensores/umbrales:", e);
      if (!isMounted.current) return;
      setSensors([]);
      setThresholdsByDevEui({});
    }
  };

  const getConnection = (idOrRoom: string | Room): ConnInfo => {
    const room =
      typeof idOrRoom === "string"
        ? sensors.find((s) => (s.devEUI ?? s.name) === idOrRoom)
        : (idOrRoom as Room);
    const latestMs = toMs((room as any)?.updatedAt ?? (room as any)?.timestamp);
    return computeConnectionFromMs(latestMs, (room as any)?.status);
  };

  const getSmartConnection = (idOrRoom: string | Room, historyOverride?: Measure[]): ConnInfo => {
    const room: Partial<Room> & Record<string, any> =
      typeof idOrRoom === "string"
        ? (sensors.find((s) => (s.devEUI ?? s.name) === idOrRoom) as any) ?? {}
        : (idOrRoom as any);

    // 1) Si hay histórico, la recencia se calcula a partir de él
    const latestMsFromHist = latestHistoryTs(historyOverride);
    if (latestMsFromHist) return computeConnectionFromMs(latestMsFromHist, room?.status);

    // 2) Fallback: updatedAt/timestamp
    const fallbackMs = toMs(room?.updatedAt ?? room?.timestamp);
    return computeConnectionFromMs(fallbackMs, room?.status);
  };

  // Limpieza/rehidratación
  useEffect(() => {
    const clear = () => {
      setSensors([]);
      setThresholdsByDevEui({});
    };
    const unregister = registerCache(clear);

    const onReset = () => {
      clear();
      void fetchSensors();
    };
    window.addEventListener("caches-reset", onReset);

    return () => {
      unregister();
      window.removeEventListener("caches-reset", onReset);
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (!hasFetched.current) {
      hasFetched.current = true;
      void fetchSensors();
    }
    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <SensorsContext.Provider
      value={{
        sensors,
        thresholdsByDevEui,
        getConnection,
        getSmartConnection,
        refreshSensors: fetchSensors,
      }}
    >
      {children}
    </SensorsContext.Provider>
  );
};
