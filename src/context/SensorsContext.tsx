import React, { createContext, useState, useEffect, useRef, type ReactNode } from "react";
import type { Room, Measure } from "../types/types";
import { sensorsService } from "../services/sensors.service";

interface SensorsContextProps {
  sensors: Room[];
  history: Record<string, Measure[]>;
  refreshSensors: () => Promise<void>;
  getSensorHistory: (devEUI: string) => Promise<void>;
}

export const SensorsContext = createContext<SensorsContextProps>({
  sensors: [],
  history: {},
  refreshSensors: async () => {},
  getSensorHistory: async () => {},
});

export const SensorsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sensors, setSensors] = useState<Room[]>([]);
  const [history, setHistory] = useState<Record<string, Measure[]>>({});
  const isMounted = useRef(true);
  const hasFetched = useRef(false);

  const fetchSensors = async () => {
    try {
      const data = await sensorsService.getAllSensors();

      if (!Array.isArray(data)) return;

      setSensors((prev) => {
        const prevStr = JSON.stringify(prev);
        const newStr = JSON.stringify(data);
        return prevStr === newStr ? prev : data;
      });

      const newHistory: Record<string, Measure[]> = {};
      data.forEach((s) => (newHistory[s.name] = s.history || []));
      setHistory(newHistory);
    } catch (error) {
      console.error("❌ Error obteniendo sensores:", error);
    }
  };

  const getSensorHistory = async (devEUI: string) => {
    try {
      const data = await sensorsService.getSensorHistory(devEUI);
      if (isMounted.current) {
        setHistory((prev) => ({ ...prev, [devEUI]: data }));
      }
    } catch (error) {
      console.error("❌ Error obteniendo histórico:", error);
    }
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
        refreshSensors: fetchSensors,
        getSensorHistory,
      }}
    >
      {children}
    </SensorsContext.Provider>
  );
};
