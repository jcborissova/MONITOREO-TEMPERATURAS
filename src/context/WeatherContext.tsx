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
  historyData: Record<string, Measure[]>; // ✅ Corregido
  openWarehousePlan: (name: string) => void;
  closeWarehousePlan: () => void;
  refreshData: () => void;
}

export const WeatherContext = createContext<WeatherContextProps>({
  selectedWarehouse: null,
  isModalOpen: false,
  climateData: null,
  allRooms: [],
  historyData: {}, // ✅ Tipado consistente
  openWarehousePlan: () => {},
  closeWarehousePlan: () => {},
  refreshData: () => {},
});

export const WeatherProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [historyData, setHistoryData] = useState<Record<string, Measure[]>>({}); // ✅
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // 🔄 Refrescar health del backend cada 60 segundos
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

  // 🌡️ Simular data inicial (esto puede venir de API o Supabase)
  const generateMockData = (): Room[] => [
    {
      name: "Cuarto Frio 1",
      temperature: 2,
      humidity: 65,
      productivity: 95,
      alert: false,
      warning: false,
      top: "20%",
      left: "30%",
      updatedAt: new Date().toISOString(),
      history: [
        { timestamp: "2025-10-01T08:00:00Z", temperature: 1.5, humidity: 63, productivity: 92 },
        { timestamp: "2025-10-02T08:00:00Z", temperature: 2.2, humidity: 66, productivity: 94 },
        { timestamp: "2025-10-03T08:00:00Z", temperature: 2.0, humidity: 65, productivity: 95 },
      ],
    },
    {
      name: "Cuarto Frio 2",
      temperature: -3,
      humidity: 70,
      productivity: 60,
      alert: true,
      warning: false,
      top: "50%",
      left: "40%",
      updatedAt: new Date().toISOString(),
      history: [
        { timestamp: "2025-10-01T08:00:00Z", temperature: -2.8, humidity: 68, productivity: 59 },
        { timestamp: "2025-10-02T08:00:00Z", temperature: -3.2, humidity: 71, productivity: 61 },
      ],
    },
    {
      name: "Despacho Frio",
      temperature: 10,
      humidity: 75,
      productivity: 45,
      alert: false,
      warning: true,
      top: "70%",
      left: "60%",
      updatedAt: new Date().toISOString(),
      history: [
        { timestamp: "2025-10-01T08:00:00Z", temperature: 9.8, humidity: 74, productivity: 43 },
        { timestamp: "2025-10-02T08:00:00Z", temperature: 10.5, humidity: 76, productivity: 47 },
      ],
    },
  ];

  // 🚀 Cargar data inicial global (usada por Dashboard y Reporte)
  useEffect(() => {
    const data = generateMockData();
    setAllRooms(data);

    // ✅ Generar histórico centralizado correctamente tipado
    const history: Record<string, Measure[]> = {};
    data.forEach((room) => {
      history[room.name] = room.history || [];
    });
    setHistoryData(history);
  }, []);

  // 🔁 Función manual de refresco (para “Actualizar datos”)
  const refreshData = () => {
    console.log("♻️ Refrescando datos...");
    setAllRooms(generateMockData());
  };

  // 🏢 Abrir plano de un almacén específico
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

  return (
    <WeatherContext.Provider
      value={{
        selectedWarehouse,
        isModalOpen,
        climateData,
        allRooms,
        historyData, // ✅ ahora bien tipado
        openWarehousePlan,
        closeWarehousePlan,
        refreshData,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
};
