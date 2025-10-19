/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useState, useEffect, type ReactNode } from "react";
import { type ClimateData, type Room, type Measure } from "../types/types";
import { locations } from "../data/Locations";
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api.config";

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

interface WeatherContextProps {
  selectedWarehouse: string | null;
  isModalOpen: boolean;
  climateData: ClimateData | null;
  allRooms: Room[];
  historyData: Record<string, Measure[]>;
  openWarehousePlan: (name: string) => void;
  closeWarehousePlan: () => void;
  refreshData: () => void;
}

export const WeatherContext = createContext<WeatherContextProps>({
  selectedWarehouse: null,
  isModalOpen: false,
  climateData: null,
  allRooms: [],
  historyData: {},
  openWarehousePlan: () => {},
  closeWarehousePlan: () => {},
  refreshData: () => {},
});

export const WeatherProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [historyData, setHistoryData] = useState<Record<string, Measure[]>>({});
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 🩺 Health check del backend
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await apiService.get<HealthStatus>(API_ENDPOINTS.HEALTH);
        setHealth(data);
      } catch (err) {
        console.error("❌ Error obteniendo health:", err);
        setHealth(null);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  // 🚀 Cargar sensores desde el backend y combinarlos con locations
  const fetchSensors = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiService.get(API_ENDPOINTS.SENSORS);
      const payload = response as any;
      const sensors: Room[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : [];

      if (!sensors.length) {
        setErrorMessage("No se encontraron sensores registrados.");
        setAllRooms([]);
        return;
      }

      // 🔁 Enlazar sensores con coordenadas y metadatos de locations
      const enriched = sensors.map((s) => {
        const loc = locations.find(
          (l) => l.name.toLowerCase().trim() === s.name?.toLowerCase().trim()
        );

        // 💡 lógica de productividad: usa dato real o simulado
        const productivity =
          s.productivity ??
          (s.temperature && s.humedity
            ? Math.max(0, 100 - Math.abs(s.temperature - 25) * 2 - Math.abs(s.humedity - 60) * 0.5)
            : Math.floor(Math.random() * 80 + 10));

        if (loc) {
          const [lat, lng] = loc.position;
          return {
            ...s,
            lat,
            lng,
            address: loc.address,
            phone: loc.phone,
            hours: loc.hours,
            imageUrl: loc.imageUrl ?? "/assets/images/agrofem.png",
            productivity,
          };
        }
        return {
          ...s,
          productivity,
        };
      });

      setAllRooms(enriched);

      // 📈 Cargar histórico de cada sensor por devEUI o nombre
      const histories: Record<string, Measure[]> = {};

      for (const s of enriched) {
        const key = s.devEUI ?? s.name; // usa devEUI si existe, o name como fallback
        if (!key) continue; // evitar errores

        try {
          const res = await apiService.get(API_ENDPOINTS.SENSOR_HISTORY(s.devEUI ?? ""));
          const sensorHistory: Measure[] =
            Array.isArray(res)
              ? res
              : res && typeof res === "object" && Array.isArray((res as any).data)
              ? (res as any).data
              : [];
          histories[key] = sensorHistory;
        } catch (err) {
          console.warn(`⚠️ Error obteniendo histórico de ${key}:`, err);
          histories[key] = [];
        }
      }

      setHistoryData(histories);

    } catch (err) {
      console.error("❌ Error cargando sensores:", err);
      setErrorMessage("Error al conectar con el servidor. Intente más tarde.");
      setAllRooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
  }, []);

  // 🔁 Refrescar datos manualmente
  const refreshData = async () => {
    await fetchSensors();
  };

  // 🏢 Abrir plano de almacén
  const openWarehousePlan = (name: string) => {
    const warehouseInfo = locations.find((w) => w.name === name);
    if (!warehouseInfo) return;

    const [lat, lng] = warehouseInfo.position;

    const enrichedRooms = allRooms.map((room) => ({
      ...room,
      lat,
      lng,
      serverHealth: health ?? undefined,
    }));

    setSelectedWarehouse(name);
    setIsModalOpen(true);
    setClimateData({ rooms: enrichedRooms });
  };

  const closeWarehousePlan = () => {
    setSelectedWarehouse(null);
    setIsModalOpen(false);
    setClimateData(null);
  };

  // 🧭 Pantalla amigable si no hay datos o error
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-700">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
        <p>Cargando datos del sistema...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-700 text-center px-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-10 h-10 text-gray-400 mb-3"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="max-w-sm">{errorMessage}</p>
        <button
          onClick={refreshData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <WeatherContext.Provider
      value={{
        selectedWarehouse,
        isModalOpen,
        climateData,
        allRooms,
        historyData,
        openWarehousePlan,
        closeWarehousePlan,
        refreshData,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
};
