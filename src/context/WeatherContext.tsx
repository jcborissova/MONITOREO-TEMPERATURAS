/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, type ReactNode } from "react";
import { type ClimateData, type Room, type Measure } from "../types/types";
import { locations } from "../data/Locations";
import { sensorsService } from "../services/sensors.service";

const CONNECTION_THRESHOLD_MIN = 30;

/* ===== Helpers de tiempo ===== */
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

/** SOLO histórico: si no hay histórico, 0 (no usamos lastPowerDate/updatedAt para "última actualización") */
const latestHistoryTs = (history?: Measure[]): number => {
  if (!Array.isArray(history) || history.length === 0) return 0;
  let max = 0;
  for (const h of history) {
    const ms = toMs((h as any).date ?? (h as any).timestamp ?? (h as any).created_at ?? (h as any).time);
    if (ms > max) max = ms;
  }
  return max;
};

/** Conexión basada en status + frescura de histórico */
const computeConnection = (
  latestMs: number,
  status?: string,
  thresholdMin = CONNECTION_THRESHOLD_MIN
) => {
  const apiSaysConnected = (status ?? "").toLowerCase() === "conectado";
  const recentByTime = latestMs ? Date.now() - latestMs <= thresholdMin * 60_000 : false;
  const isConnected = apiSaysConnected || recentByTime;
  return {
    isConnected,
    last: latestMs ? new Date(latestMs) : null,
    diffMin: latestMs ? (Date.now() - latestMs) / 60_000 : Infinity,
  };
};

interface WarehouseData {
  name: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
  hours: string;
  imageUrl?: string;
}

interface WeatherContextProps {
  warehouse: WarehouseData | null;
  sensors: Room[];
  climateData: ClimateData | null;
  historyData: Record<string, Measure[]>;
  selectedWarehouse: string | null;
  isModalOpen: boolean;
  isLoading: boolean;
  openWarehousePlan: (name: string) => Promise<void>;
  closeWarehousePlan: () => void;
  refreshData: () => Promise<void>;
}

export const WeatherContext = createContext<WeatherContextProps>({
  warehouse: null,
  sensors: [],
  climateData: null,
  historyData: {},
  selectedWarehouse: null,
  isModalOpen: false,
  isLoading: false,
  openWarehousePlan: async () => {},
  closeWarehousePlan: () => {},
  refreshData: async () => {},
});

export const WeatherProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [warehouse, setWarehouse] = useState<WarehouseData | null>(null);
  const [sensors, setSensors] = useState<Room[]>([]);
  const [historyData, setHistoryData] = useState<Record<string, Measure[]>>({});
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /** Trae sensores y retorna la lista enriquecida (última actualización = último registro del histórico) */
  const fetchSensors = async (): Promise<Room[]> => {
    setIsLoading(true);
    try {
      const list = await sensorsService.getAllSensors();

      // Histórico en paralelo (clave: devEUI || name)
      const historyEntries = await Promise.all(
        list.map(async (s: any) => {
          const key = s.devEUI ?? s.name;
          try {
            const hist = await sensorsService.getSensorHistory(key);
            return [key, Array.isArray(hist) ? hist : []] as const;
          } catch {
            return [key, [] as Measure[]] as const;
          }
        })
      );
      const historyMap = Object.fromEntries(historyEntries);
      setHistoryData(historyMap);

      // Conexión/última actualización calculadas SÓLO con histórico
      const enriched: Room[] = list.map((s: any) => {
        const key = s.devEUI ?? s.name;
        const latestMs = latestHistoryTs(historyMap[key]);
        const { isConnected, last, diffMin } = computeConnection(latestMs, s.status);
        return {
          ...s,
          isConnected,
          lastSeen: last ? last.toISOString() : undefined, // “Última actualización” (histórico)
          diffMin,
        } as Room;
      });

      setSensors(enriched);
      return enriched;
    } catch (err) {
      console.error("Error cargando sensores:", err);
      setSensors([]);
      setHistoryData({});
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSensors();
  }, []);

  /** Abre modal garantizando rooms frescos */
  const openWarehousePlan = async (name: string) => {
    const loc = locations.find((l) => l.name === name);
    if (!loc) return;

    const current = sensors.length > 0 ? sensors : await fetchSensors();

    setWarehouse({
      name: loc.name,
      lat: loc.position[0],
      lng: loc.position[1],
      address: loc.address,
      phone: loc.phone,
      hours: loc.hours,
      imageUrl: loc.imageUrl,
    });

    setSelectedWarehouse(name);
    setClimateData({ rooms: current });
    setIsModalOpen(true);
  };

  const closeWarehousePlan = () => {
    setSelectedWarehouse(null);
    setIsModalOpen(false);
    setClimateData(null);
  };

  const refreshData = async () => {
    const fresh = await fetchSensors();
    if (isModalOpen) setClimateData({ rooms: fresh });
  };

  /** Listener del CustomEvent */
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent<{ name: string }>).detail;
      if (detail?.name) await openWarehousePlan(detail.name);
    };
    window.addEventListener("open-warehouse-plan", handler as EventListener);
    return () => window.removeEventListener("open-warehouse-plan", handler as EventListener);
  }, [sensors, isModalOpen]);

  return (
    <WeatherContext.Provider
      value={{
        warehouse,
        sensors,
        climateData,
        historyData,
        selectedWarehouse,
        isModalOpen,
        isLoading,
        openWarehousePlan,
        closeWarehousePlan,
        refreshData,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
};
