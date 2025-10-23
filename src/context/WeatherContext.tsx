/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, type ReactNode } from "react";
import { type ClimateData, type Room, type Measure } from "../types/types";
import { locations } from "../data/Locations";
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api.config";
import { sensorsLayout } from "../data/SensorsLayout";

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
  openWarehousePlan: (name: string) => void;
  closeWarehousePlan: () => void;
  refreshData: () => void;
}

export const WeatherContext = createContext<WeatherContextProps>({
  warehouse: null,
  sensors: [],
  climateData: null,
  historyData: {},
  selectedWarehouse: null,
  isModalOpen: false,
  isLoading: false,
  openWarehousePlan: () => {},
  closeWarehousePlan: () => {},
  refreshData: () => {},
});

export const WeatherProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [warehouse, setWarehouse] = useState<WarehouseData | null>(null);
  const [sensors, setSensors] = useState<Room[]>([]);
  const [historyData, setHistoryData] = useState<Record<string, Measure[]>>({});
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // ✅ ahora se usa realmente

  // 📍 Genera una posición pseudoestable para cada sensor (para visualización en plano)
  const getStablePosition = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const normalized = (n: number) => 10 + (Math.abs(n) % 75);
    const top = `${normalized(hash) + 5 * ((hash % 3) - 1)}%`;
    const left = `${normalized(hash * 13) + 5 * ((hash % 5) - 2)}%`;
    return { top, left };
  };

  // 🌡️ Obtiene sensores y su historial de mediciones
  const fetchSensors = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.get(API_ENDPOINTS.SENSORS);
      const payload = response as any;

      const sensorList: Room[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
        ? payload.data
        : [];

      const baseLoc = locations[0]; // ✅ Por ahora un solo almacén base

      const enriched = sensorList.map((s, idx) => {
        const layout =
          sensorsLayout[s.deviceName ?? s.name] ??
          getStablePosition(s.deviceName ?? s.name ?? `Sensor-${idx}`);
        const updatedAt =
          s.updatedAt ?? s.lastPowerDate ?? s.timestamp ?? new Date().toISOString();

        const productivity =
          s.productivity ??
          (s.temperature && s.humedity
            ? Math.max(
                0,
                100 -
                  Math.abs(s.temperature - 25) * 2 -
                  Math.abs(s.humedity - 60) * 0.5
              )
            : Math.floor(Math.random() * 80 + 10));

        return {
          ...s,
          name: s.deviceName ?? s.name ?? `Sensor-${idx + 1}`,
          updatedAt,
          top: layout.top,
          left: layout.left,
          lat: baseLoc.position[0],
          lng: baseLoc.position[1],
          address: baseLoc.address,
          phone: baseLoc.phone,
          hours: baseLoc.hours,
          imageUrl: baseLoc.imageUrl,
          productivity,
        };
      });

      setSensors(enriched);

      // 📈 Cargar históricos de cada sensor
      const histories: Record<string, Measure[]> = {};
      for (const sensor of enriched) {
        const key = sensor.devEUI ?? sensor.name;
        try {
          const res: any = await apiService.get(
            API_ENDPOINTS.SENSOR_HISTORY(sensor.devEUI ?? "")
          );
          const sensorHistory: Measure[] = Array.isArray(res)
            ? res
            : res.data ?? [];
          histories[key] = sensorHistory;
        } catch {
          histories[key] = [];
        }
      }
      setHistoryData(histories);
    } catch (err) {
      console.error("Error cargando sensores:", err);
      setSensors([]);
    } finally {
      setIsLoading(false); // ✅ asegura siempre el cambio
    }
  };

  useEffect(() => {
    // ⏱️ Carga inicial de sensores
    fetchSensors();
  }, []);

  // 🔁 Refresca datos manualmente (por ejemplo, botón “Actualizar”)
  const refreshData = async () => {
    await fetchSensors();
  };

  // 🏢 Abre el plano interactivo del almacén
  const openWarehousePlan = (name: string) => {
    const loc = locations.find((l) => l.name === name);
    if (!loc) return;

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
    setIsModalOpen(true);
    setClimateData({ rooms: sensors });
  };

  // ❌ Cierra el modal y limpia estado
  const closeWarehousePlan = () => {
    setSelectedWarehouse(null);
    setIsModalOpen(false);
    setClimateData(null);
  };

  // 🧩 Contexto global expuesto
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
