/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useState, useEffect, useRef, type ReactNode } from "react";
import type { Room, Measure } from "../types/types";
import { sensorsService } from "../services/sensors.service";
import { getAllThresholdsMap, type SensorThreshold } from "../services/thresholds.service";

/* =========================
   Config
========================= */
const CONNECTION_THRESHOLD_MIN = 30;

/* =========================
   Utils
========================= */
export type ConnInfo = {
  isConnected: boolean;
  last: Date | null;
  diffMin: number;
  status?: string;
  apiSaysConnected: boolean;
  recentByTime: boolean;
};

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

const computeConnection = (
  updatedAt?: string | Date,
  status?: string,
  thresholdMin = CONNECTION_THRESHOLD_MIN
): ConnInfo => {
  const last = updatedAt ? new Date(updatedAt) : null;
  const diffMin = last ? (Date.now() - last.getTime()) / 60000 : Infinity;

  const apiSaysConnected = (status ?? "").toLowerCase() === "conectado";
  const recentByTime = diffMin <= thresholdMin;

  return {
    isConnected: apiSaysConnected || recentByTime,
    last,
    diffMin,
    status,
    apiSaysConnected,
    recentByTime,
  };
};

const pickLatestTs = (room: Partial<Room> & Record<string, any>, history?: Measure[]): number => {
  const hMax =
    Array.isArray(history) && history.length
      ? Math.max(
          ...history
            .map((h: any) => toMs(h.date ?? h.timestamp ?? h.created_at ?? h.time))
            .filter((n) => n > 0)
        )
      : 0;

  const lp = toMs(room?.lastPowerDate);
  const up = toMs(room?.updatedAt ?? room?.timestamp);
  return Math.max(hMax || 0, lp || 0, up || 0);
};

const buildConnMap = (list: Room[]) => {
  const map: Record<string, ConnInfo> = {};
  list.forEach((s) => {
    const key = s.devEUI ?? s.name;
    map[key] = computeConnection((s as any).updatedAt, (s as any).status);
  });
  return map;
};

const enrichRoomsWithConn = (list: Room[]) =>
  list.map((s) => {
    const conn = computeConnection((s as any).updatedAt, (s as any).status);
    return {
      ...s,
      isConnected: conn.isConnected,
      lastSeen: conn.last ? conn.last.toISOString() : undefined,
      diffMin: conn.diffMin,
    } as Room;
  });

/* =========================
   Context
========================= */
interface SensorsContextProps {
  sensors: Room[];
  history: Record<string, Measure[]>;
  connectionById: Record<string, ConnInfo>;
  thresholdsByDevEui: Record<string, SensorThreshold>;
  /** Conexión solo por timestamps propios (retrocompat) */
  getConnection: (idOrRoom: string | Room) => ConnInfo;
  /** NUEVO: Conexión “inteligente” que combina status + histórico + lastPowerDate + updatedAt */
  getSmartConnection: (idOrRoom: string | Room, history?: Measure[]) => ConnInfo;
  refreshSensors: () => Promise<void>;
  getSensorHistory: (devEUI: string) => Promise<void>;
  CONNECTION_THRESHOLD_MIN: number;
}

export const SensorsContext = createContext<SensorsContextProps>({
  sensors: [],
  history: {},
  connectionById: {},
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
  getSensorHistory: async () => {},
  CONNECTION_THRESHOLD_MIN,
});

export const SensorsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sensors, setSensors] = useState<Room[]>([]);
  const [history, setHistory] = useState<Record<string, Measure[]>>({});
  const [connectionById, setConnectionById] = useState<Record<string, ConnInfo>>({});
  const [thresholdsByDevEui, setThresholdsByDevEui] = useState<Record<string, SensorThreshold>>({});

  const isMounted = useRef(true);
  const hasFetched = useRef(false);

  const fetchSensors = async () => {
    try {
      const [rawSensors, thMap] = await Promise.all([
        sensorsService.getAllSensors(),
        getAllThresholdsMap().catch(() => ({} as Record<string, SensorThreshold>)),
      ]);

      if (!Array.isArray(rawSensors)) return;

      const list = enrichRoomsWithConn(rawSensors);
      setSensors((prev) => (JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
      setConnectionById(buildConnMap(list));
      setThresholdsByDevEui(thMap);

      // Inicializa contenedor de históricos
      const initHistory: Record<string, Measure[]> = {};
      list.forEach((s) => (initHistory[s.devEUI ?? s.name] = []));
      setHistory(initHistory);
    } catch (error) {
      console.error("Error obteniendo sensores/umbrales:", error);
    }
  };

  const getSensorHistory = async (devEUI: string) => {
    try {
      const data = await sensorsService.getSensorHistory(devEUI);
      if (isMounted.current) {
        setHistory((prev) => ({ ...prev, [devEUI]: Array.isArray(data) ? data : [] }));
      }
    } catch (error) {
      console.error("Error obteniendo histórico:", error);
    }
  };

  const getConnection = (idOrRoom: string | Room): ConnInfo => {
    const key = typeof idOrRoom === "string" ? idOrRoom : (idOrRoom.devEUI ?? idOrRoom.name);
    const cached = connectionById[key];
    if (cached) return cached;

    const room =
      typeof idOrRoom === "string"
        ? sensors.find((s) => (s.devEUI ?? s.name) === idOrRoom)
        : (idOrRoom as Room);

    if (!room) {
      return { isConnected: false, last: null, diffMin: Infinity, status: undefined, apiSaysConnected: false, recentByTime: false };
    }
    const conn = computeConnection((room as any).updatedAt, (room as any).status);
    return conn;
  };

  /** <<< NUEVO: conexión unificada basada en histórico + status + lastPowerDate + updatedAt >>> */
  const getSmartConnection = (idOrRoom: string | Room, hist?: Measure[]): ConnInfo => {
    const room: Partial<Room> & Record<string, any> =
      typeof idOrRoom === "string"
        ? (sensors.find((s) => (s.devEUI ?? s.name) === idOrRoom) as any) ?? {}
        : (idOrRoom as any);

    const latestMs = pickLatestTs(room, hist);
    const status = room?.status as string | undefined;
    const apiSaysConnected = (status ?? "").toLowerCase() === "conectado";
    const recentByTime = latestMs ? Date.now() - latestMs <= CONNECTION_THRESHOLD_MIN * 60_000 : false;

    return {
      isConnected: apiSaysConnected || recentByTime,
      last: latestMs ? new Date(latestMs) : null,
      diffMin: latestMs ? (Date.now() - latestMs) / 60_000 : Infinity,
      status,
      apiSaysConnected,
      recentByTime,
    };
  };

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
        history,
        connectionById,
        thresholdsByDevEui,
        getConnection,
        getSmartConnection, // <<– expuesto
        refreshSensors: fetchSensors,
        getSensorHistory,
        CONNECTION_THRESHOLD_MIN,
      }}
    >
      {children}
    </SensorsContext.Provider>
  );
};
