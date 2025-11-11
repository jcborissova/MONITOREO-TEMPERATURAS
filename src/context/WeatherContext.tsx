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

/* ===== Tipos de datos locales ===== */
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
  /** histórico "muestra" por sensor (últimas ~24h) */
  historyData: Record<string, Measure[]>;
  selectedWarehouse: string | null;
  isModalOpen: boolean;
  isLoading: boolean;
  /** loading exclusivo de los fetch por rango (para UI tipo chip/spinner) */
  isRangeLoading: boolean;

  openWarehousePlan: (name: string) => Promise<void>;
  closeWarehousePlan: () => void;

  /** Refresca datos; si no ha pasado POLL_MS, NO hará fetch a menos que force=true */
  refreshData: (force?: boolean) => Promise<void>;
  /** fetch histórico de TODOS los sensores en un rango [from,to] (ISO) con pool de concurrencia */
  fetchHistoryRange: (opts: {
    from: string;
    to: string;
    pageSize?: number;
    maxPages?: number;
  }) => Promise<void>;
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
  const { sensors: sensorsFromCtx, refreshSensors: refreshSensorsOnly } = React.useContext(SensorsContext);

  const [warehouse, setWarehouse] = useState<WarehouseData | null>(null);
  const [sensors, setSensors] = useState<Room[]>([]);
  const [historyData, setHistoryData] = useState<Record<string, Measure[]>>({});
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRangeLoading, setIsRangeLoading] = useState<boolean>(false);

  /* ====== Control Fino de Loading de Rango ====== */
  const rangeOpsRef = useRef(0);                               // contador de batches activos
  const rangeCtrlRef = useRef<AbortController | null>(null);   // abort del batch vigente
  const rangeGenRef = useRef(0);                               // generación (para abortar anteriores)
  const rangeShowSinceRef = useRef<number>(0);                 // inicio del loading visible
  const rangeWatchdogRef = useRef<number | null>(null);        // id de watchdog
  const MIN_LOADING_MS = 500;
  const WATCHDOG_MS = 120_000;

  const beginRangeLoading = () => {
    if (rangeOpsRef.current === 0) {
      setIsRangeLoading(true);
      rangeShowSinceRef.current = Date.now();
      if (rangeWatchdogRef.current) window.clearTimeout(rangeWatchdogRef.current);
      rangeWatchdogRef.current = window.setTimeout(() => {
        rangeOpsRef.current = 0;
        setIsRangeLoading(false);
        rangeWatchdogRef.current = null;
        console.warn("[WeatherContext] Watchdog cerró loading de rango por timeout");
      }, WATCHDOG_MS);
    }
    rangeOpsRef.current++;
  };

  const endRangeLoading = () => {
    rangeOpsRef.current = Math.max(0, rangeOpsRef.current - 1);
    if (rangeOpsRef.current === 0) {
      const elapsed = Date.now() - rangeShowSinceRef.current;
      const remain = Math.max(0, MIN_LOADING_MS - elapsed);
      const finish = () => {
        setIsRangeLoading(false);
        if (rangeWatchdogRef.current) {
          window.clearTimeout(rangeWatchdogRef.current);
          rangeWatchdogRef.current = null;
        }
      };
      if (remain > 0) setTimeout(finish, remain);
      else finish();
    }
  };

  /* ====== In-flight de-dup para rango por sensor ====== */
  type RangeKey = `${string}__${number}__${number}`; // devEUI__startMs__endMs
  const inflightRange = useRef(new Map<RangeKey, Promise<Measure[]>>());
  const cacheRange = useRef(new Map<RangeKey, Measure[]>()); // cache corta del rango ya traído

  const mergeHistory = useCallback((prev: Measure[], next: Measure[]) => {
    const map = new Map<number, Measure>();
    for (const r of prev) map.set(new Date(r.timestamp).getTime(), r);
    for (const r of next) map.set(new Date(r.timestamp).getTime(), r);
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, []);

  /** Carga sensores + un "sample" (~24h) en paralelo y ligero */
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

      const enriched = list.map((s) => {
        const key = s.devEUI ?? s.name;
        const arr = histMap[key];
        const latestMs = arr?.length
          ? new Date(arr[arr.length - 1].timestamp).getTime()
          : 0;
        const isConnected = latestMs
          ? Date.now() - latestMs <= 30 * 60_000
          : false;
        return {
          ...s,
          isConnected,
          lastSeen: latestMs ? new Date(latestMs).toISOString() : s.lastSeen,
          diffMin: latestMs ? (Date.now() - latestMs) / 60_000 : s.diffMin,
        };
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
  }, [sensorsFromCtx]);

  // Primer fetch al montar (una sola vez)
  useEffect(() => {
    void fetchSensors();
  }, [fetchSensors]);

  /** Rango por sensor con cache + de-dup */
  const fetchHistoryRangeFor = useCallback(
    async (
      devEUI: string,
      opts: {
        from: string;
        to: string;
        pageSize?: number;
        maxPages?: number;
        signal?: AbortSignal;
      }
    ) => {
      if (!devEUI || !opts?.from || !opts?.to) return [] as Measure[];

      const startMs = new Date(opts.from).getTime();
      const endMs = new Date(opts.to).getTime();
      const key = `${devEUI}__${startMs}__${endMs}` as RangeKey;

      const cached = cacheRange.current.get(key);
      if (cached) return cached;

      const inflight = inflightRange.current.get(key);
      if (inflight) return inflight;

      const promise = sensorsService
        .getSensorHistoryRange(devEUI, {
          since: opts.from,
          until: opts.to,
          pageSize: opts.pageSize ?? 500, // compat
          maxPages: opts.maxPages ?? 10,  // compat
          signal: opts.signal,
        })
        .then((data) => {
          cacheRange.current.set(key, data);
          setHistoryData((prev) => {
            const curr = prev[devEUI] ?? [];
            return { ...prev, [devEUI]: mergeHistory(curr, data) };
          });
          return data;
        })
        .finally(() => {
          inflightRange.current.delete(key);
        });

      inflightRange.current.set(key, promise);
      return promise;
    },
    [mergeHistory]
  );

  /** Rango para TODOS los sensores con pool de concurrencia + abort + watchdog */
  const fetchHistoryRange = useCallback(
    async (opts: {
      from: string;
      to: string;
      pageSize?: number;
      maxPages?: number;
    }) => {
      if (!opts?.from || !opts?.to) return;

      rangeGenRef.current++;
      const myGen = rangeGenRef.current;

      if (rangeCtrlRef.current) {
        try { rangeCtrlRef.current.abort(); } catch {}
      }
      const ctrl = new AbortController();
      rangeCtrlRef.current = ctrl;

      beginRangeLoading();

      try {
        const keys = sensors
          .map((s) => s.devEUI ?? s.name)
          .filter(Boolean) as string[];
        if (keys.length === 0) return;

        const POOL = Math.min(6, Math.max(3, Math.ceil(keys.length / 4)));
        let idx = 0;

        const worker = async () => {
          while (idx < keys.length) {
            if (myGen !== rangeGenRef.current) return;
            const my = idx++;
            const key = keys[my];
            try {
              await fetchHistoryRangeFor(key, { ...opts, signal: ctrl.signal });
            } catch (e: any) {
              if (e?.name !== "AbortError") {
                // opcional: log suave
              }
            }
            await new Promise((r) => setTimeout(r, 40));
          }
        };

        await Promise.all(
          Array.from({ length: Math.min(POOL, keys.length) }, () => worker())
        );

        if (myGen !== rangeGenRef.current) return;

      } finally {
        endRangeLoading();
        // limpia controller vigente
        if (rangeCtrlRef.current?.signal === ctrl.signal) {
          rangeCtrlRef.current = null;
        }
      }
    },
    [sensors, fetchHistoryRangeFor]
  );

  /** Abre modal garantizando rooms frescos */
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

  /* --------- POLL GLOBAL CADA 10s (persistente entre navegaciones/HMR) --------- */
  const POLL_MS = 5 * 60 * 1000;
  const lastRefreshRef = useRef<number>(0);
  const isRefreshingRef = useRef(false);

  const refreshData = useCallback(
    async (force = false) => {
      if (isRefreshingRef.current) return;
      const elapsed = Date.now() - (lastRefreshRef.current || 0);
      if (!force && elapsed < POLL_MS) {
        // Demasiado pronto; evita llamadas por navegación o renders
        return;
      }
      isRefreshingRef.current = true;
      try {
        // refresca lista en el provider de sensores (evita doble request)
        await refreshSensorsOnly();

        // trae sensores frescos
        const latest = await sensorsService.getAllSensors(true);
        setSensors(latest);
        if (isModalOpen) setClimateData({ rooms: latest });

        // refresca la "muestra" de histórico (~24h = 288 puntos)
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
        setHistoryData(Object.fromEntries(entries));
        lastRefreshRef.current = Date.now();
      } catch (e) {
        console.error("WeatherContext.refreshData error:", e);
      } finally {
        isRefreshingRef.current = false;
      }
    },
    [refreshSensorsOnly, isModalOpen]
  );

  // Mantener la versión fresca de refreshData para el setInterval
  const refreshFnRef = useRef(refreshData);
  useEffect(() => {
    refreshFnRef.current = refreshData;
  }, [refreshData]);

  // Crear / actualizar el poller global respetando POLL_MS, y forzar un refresh inmediato
  useEffect(() => {
    const w = window as any;

    const createPoller = () => {
      const id = window.setInterval(() => {
        void refreshFnRef.current(false);
      }, POLL_MS);

      w.__weatherPoller = { id, pollMs: POLL_MS, createdAt: Date.now() };
      // refresh inmediato para no esperar el primer tick
      void refreshFnRef.current(true);
      // console.debug("[Weather] poller creado", POLL_MS);
    };

    if (w.__weatherPoller?.id) {
      // Si existe pero con otro intervalo, lo reemplazamos
      if (w.__weatherPoller.pollMs !== POLL_MS) {
        try { window.clearInterval(w.__weatherPoller.id); } catch {}
        createPoller();
      } else {
        // Ya existe y con el mismo intervalo; opcionalmente refrescamos suave
        void refreshFnRef.current(false);
      }
    } else {
      createPoller();
    }

    // Nota: no limpiamos aquí para mantener el poller vivo entre navegaciones.
    // Si prefieres limpiarlo al desmontar este Provider, usa:
    // return () => { try { window.clearInterval((window as any).__weatherPoller?.id); } catch {} };
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

  // Atajo para abrir modal vía CustomEvent
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent<{ name: string }>).detail;
      if (detail?.name) await openWarehousePlan(detail.name);
    };
    window.addEventListener("open-warehouse-plan", handler as EventListener);
    return () => window.removeEventListener("open-warehouse-plan", handler as EventListener);
  }, [openWarehousePlan]);

  return (
    <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>
  );
};
