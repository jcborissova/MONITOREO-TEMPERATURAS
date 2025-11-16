/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ClimateData, Room, Measure } from "../types/types";
import { locations } from "../data/Locations";
import { sensorsService } from "../services/sensors.service";
import { SensorsContext } from "./SensorsContext";
import { registerCache } from "../services/cacheRegistry";

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
  isRangeLoading: boolean;

  openWarehousePlan: (name: string) => Promise<void>;
  closeWarehousePlan: () => void;

  refreshData: (force?: boolean) => Promise<void>;
  fetchHistoryRange: (opts: { from: string; to: string }) => Promise<void>;
}

export const WeatherContext = createContext<WeatherContextProps>({
  warehouse: null,
  sensors: [],
  climateData: null,
  historyData: {},
  selectedWarehouse: null,
  isModalOpen: false,
  isLoading: true,
  isRangeLoading: false,
  openWarehousePlan: async () => {},
  closeWarehousePlan: () => {},
  refreshData: async () => {},
  fetchHistoryRange: async () => {},
});

export const WeatherProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { sensors: sensorsFromCtx, refreshSensors: refreshSensorsOnly } =
    React.useContext(SensorsContext);

  const [warehouse, setWarehouse] = useState<WarehouseData | null>(null);
  const [sensors, setSensors] = useState<Room[]>([]);
  const [historyData, setHistoryData] = useState<Record<string, Measure[]>>({});
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRangeLoading, setIsRangeLoading] = useState<boolean>(false);

  // Loading visible del rango
  const rangeOpsRef = useRef(0);
  const rangeShowSinceRef = useRef(0);
  const beginRangeLoading = () => {
    if (rangeOpsRef.current === 0) {
      setIsRangeLoading(true);
      rangeShowSinceRef.current = Date.now();
    }
    rangeOpsRef.current++;
  };
  const endRangeLoading = () => {
    rangeOpsRef.current = Math.max(0, rangeOpsRef.current - 1);
    if (rangeOpsRef.current === 0) {
      const elapsed = Date.now() - rangeShowSinceRef.current;
      const remain = Math.max(0, 350 - elapsed);
      window.setTimeout(() => setIsRangeLoading(false), remain);
    }
  };

  // Merge por timestamp
  const mergeHistory = useCallback((prev: Measure[], next: Measure[]) => {
    if (!Array.isArray(prev) || prev.length === 0) return next.slice();
    if (!Array.isArray(next) || next.length === 0) return prev.slice();
    const map = new Map<number, Measure>();
    for (const r of prev) map.set(new Date(r.timestamp).getTime(), r);
    for (const r of next) map.set(new Date(r.timestamp).getTime(), r);
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, []);

  /** Sensores + muestra (~24h) */
  const fetchSensors = useCallback(async (): Promise<Room[]> => {
    setIsLoading(true);
    try {
      const list = sensorsFromCtx.length
        ? sensorsFromCtx
        : await sensorsService.getAllSensors();

      const entries = await Promise.all(
        list.map(async (s) => {
          const key = s.devEUI ?? s.name;
          try {
            const hist = await sensorsService.getSensorHistory(key, 288);
            return [key, hist] as const;
          } catch {
            return [key, [] as Measure[]] as const;
          }
        })
      );
      const histMap = Object.fromEntries(entries);
      setHistoryData(histMap);
      setSensors(list);
      return list;
    } catch (err) {
      console.error("Error cargando sensores:", err);
      setSensors([]);
      setHistoryData({});
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [sensorsFromCtx]);

  useEffect(() => {
    void fetchSensors();
  }, [fetchSensors]);

  const ensureSensors = useCallback(async () => {
    if (sensors.length > 0) return sensors;
    return await fetchSensors();
  }, [sensors, fetchSensors]);

  /** Descarga rango para todos los sensores (el servicio hace la cobertura por `limit`) */
  const fetchHistoryRange = useCallback(
    async (opts: { from: string; to: string }) => {
      if (!opts?.from || !opts?.to) return;
      const list = await ensureSensors();
      if (list.length === 0) return;

      beginRangeLoading();
      try {
        const keys = list.map((s) => s.devEUI ?? s.name).filter(Boolean) as string[];
        const POOL = Math.min(6, Math.max(3, Math.ceil(keys.length / 4)));
        let idx = 0;

        const worker = async () => {
          while (idx < keys.length) {
            const my = idx++;
            const devEUI = keys[my];
            try {
              const data = await sensorsService.getSensorHistoryRange(devEUI, {
                since: opts.from,
                until: opts.to,
              });
              setHistoryData((prev) => {
                const curr = prev[devEUI] ?? [];
                return { ...prev, [devEUI]: mergeHistory(curr, data) };
              });
            } catch {}
            await new Promise((r) => setTimeout(r, 30));
          }
        };

        await Promise.all(
          Array.from({ length: Math.min(POOL, keys.length) }, () => worker())
        );
      } finally {
        endRangeLoading();
      }
    },
    [ensureSensors, mergeHistory]
  );

  /** Refresco global periódico */
  const POLL_MS = 5 * 60 * 1000;
  const lastRefreshRef = useRef<number>(0);
  const refreshingRef = useRef(false);

  const refreshData = useCallback(
    async (force = false) => {
      if (refreshingRef.current) return;
      const elapsed = Date.now() - (lastRefreshRef.current || 0);
      if (!force && elapsed < POLL_MS) return;

      refreshingRef.current = true;
      try {
        await refreshSensorsOnly();
        const latest = await sensorsService.getAllSensors(true);
        setSensors(latest);

        const entries = await Promise.all(
          latest.map(async (s) => {
            const key = s.devEUI ?? s.name;
            try {
              const hist = await sensorsService.getSensorHistory(key, 288);
              return [key, hist] as const;
            } catch {
              return [key, [] as Measure[]] as const;
            }
          })
        );
        setHistoryData((prev) => {
          const clone = { ...prev };
          for (const [k, sample] of entries) {
            clone[k] = mergeHistory(clone[k] ?? [], sample);
          }
          return clone;
        });

        lastRefreshRef.current = Date.now();
      } catch (e) {
        console.error("WeatherContext.refreshData error:", e);
      } finally {
        refreshingRef.current = false;
      }
    },
    [refreshSensorsOnly, mergeHistory]
  );

  // Registro de limpieza + rehidratación tras "caches-reset"
  useEffect(() => {
    const clear = () => {
      setWarehouse(null);
      setSensors([]);
      setHistoryData({});
      setClimateData(null);
      setSelectedWarehouse(null);
      rangeOpsRef.current = 0;
      rangeShowSinceRef.current = 0;
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
  }, [fetchSensors]);

  /** 👉 OPEN WAREHOUSE PLAN como callback reutilizable */
  const openWarehousePlan = useCallback(
    async (name: string) => {
      const loc = locations.find((l) => l.name === name);
      if (!loc) return;

      const current = sensors.length ? sensors : await fetchSensors();

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
    },
    [sensors, fetchSensors]
  );

  const closeWarehousePlan = useCallback(() => {
    setSelectedWarehouse(null);
    setIsModalOpen(false);
    setClimateData(null);
  }, []);

  /** 👉 Listener global del CustomEvent "open-warehouse-plan" */
  useEffect(() => {
    const handler = (e: Event) => {
      const evt = e as CustomEvent<{ name?: string }>;
      const name = evt.detail?.name;
      if (!name) return;
      void openWarehousePlan(name);
    };

    window.addEventListener("open-warehouse-plan", handler as EventListener);
    return () => {
      window.removeEventListener("open-warehouse-plan", handler as EventListener);
    };
  }, [openWarehousePlan]);

  // 🔁 Mantener refreshData en una ref para el poller
  const refreshDataRef = useRef(refreshData);
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);

  // 👉 Poller persistente (estable, sin loops)
  useEffect(() => {
    const w = window as any;

    const create = () => {
      const id = window.setInterval(() => {
        void refreshDataRef.current?.(false);
      }, POLL_MS);

      w.__weatherPoller = { id, pollMs: POLL_MS, createdAt: Date.now() };

      // primer disparo fuerte al montar
      void refreshDataRef.current?.(true);
    };

    if (w.__weatherPoller?.id) {
      if (w.__weatherPoller.pollMs !== POLL_MS) {
        try {
          clearInterval(w.__weatherPoller.id);
        } catch {}
        create();
      } else {
        // ya existe → solo pide refresh suave
        void refreshDataRef.current?.(false);
      }
    } else {
      create();
    }

    // cleanup al desmontar
    return () => {
      if (w.__weatherPoller?.id) {
        try {
          clearInterval(w.__weatherPoller.id);
        } catch {}
        w.__weatherPoller = null;
      }
    };
  }, [POLL_MS]);

  const value = useMemo<WeatherContextProps>(
    () => ({
      warehouse,
      sensors,
      climateData,
      historyData,
      selectedWarehouse,
      isModalOpen,
      isLoading,
      isRangeLoading,
      openWarehousePlan,
      closeWarehousePlan,
      refreshData,
      fetchHistoryRange,
    }),
    [
      warehouse,
      sensors,
      climateData,
      historyData,
      selectedWarehouse,
      isModalOpen,
      isLoading,
      isRangeLoading,
      openWarehousePlan,
      closeWarehousePlan,
      refreshData,
      fetchHistoryRange,
    ]
  );

  return (
    <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>
  );
};
