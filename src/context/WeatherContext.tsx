// src/context/WeatherContext.tsx
import React, { createContext, useState, type ReactNode } from "react";
import { type ClimateData } from "../types/types";
import { bravoLocations } from "../data/BravoLocations";

interface WeatherContextProps {
  selectedWarehouse: string | null;
  isModalOpen: boolean;
  climateData: ClimateData | null;
  openWarehousePlan: (name: string) => void;
  closeWarehousePlan: () => void;
}

export const WeatherContext = createContext<WeatherContextProps>({
  selectedWarehouse: null,
  isModalOpen: false,
  climateData: null,
  openWarehousePlan: () => {},
  closeWarehousePlan: () => {},
});

export const WeatherProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [climateData, setClimateData] = useState<ClimateData | null>(null);

  const openWarehousePlan = (name: string) => {
    const warehouseInfo = bravoLocations.find((w) => w.name === name);
    if (!warehouseInfo) return;

    const [lat, lng] = warehouseInfo.position;

    const baseRooms = [
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
          {
            timestamp: "2024-05-26T14:00:00Z",
            temperature: 1.5,
            humidity: 63,
            productivity: 94,
          },
          {
            timestamp: "2024-05-26T13:00:00Z",
            temperature: 2.1,
            humidity: 67,
            productivity: 92,
          },
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
        history: [],
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
      },
    ];

    const enrichedRooms = baseRooms.map((room) => ({
      ...room,
      lat,
      lng,
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
        openWarehousePlan,
        closeWarehousePlan,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
};
