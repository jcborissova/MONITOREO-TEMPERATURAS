/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  EyeIcon,
  Cog6ToothIcon,
  Battery50Icon,
  ArrowPathIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import PageContainer from "../components/layout/PageContainer";
import AlertThresholdModal from "../components/devices/AlertThresholdModal";
import DeviceDetailsModal from "../components/devices/DeviceDetailsModal";
import { WeatherContext } from "../context/WeatherContext";
import type { Room } from "../types/types";

interface DeviceThresholds {
  id: string;
  maxTemp?: number;
  minTemp?: number;
}

const DevicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { allRooms, refreshData } = useContext(WeatherContext);

  const [selectedDevice, setSelectedDevice] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [thresholds, setThresholds] = useState<DeviceThresholds[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🧠 Abrir modal de configuración
  const handleOpenConfig = (room: Room) => {
    setSelectedDevice(room);
    setIsModalOpen(true);
  };

  // 🧠 Abrir modal de detalles
  const handleViewDetails = (room: Room) => {
    setSelectedDevice(room);
    setIsDetailsOpen(true);
  };

  const handleSaveThresholds = (roomName: string, maxTemp: number, minTemp: number) => {
    setThresholds((prev) => {
      const updated = prev.filter((t) => t.id !== roomName);
      return [...updated, { id: roomName, maxTemp, minTemp }];
    });
  };

  const getThresholds = (roomName: string) =>
    thresholds.find((t) => t.id === roomName) || { maxTemp: undefined, minTemp: undefined };

  // 🔁 Refrescar datos
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (refreshData) refreshData();
    setIsRefreshing(false);
  };

  return (
    <PageContainer
      title="Gestión de Dispositivos"
      description="Monitorea las zonas y configura los umbrales de temperatura y humedad."
    >
      {/* Botón actualizar */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition ${
            isRefreshing ? "opacity-70 cursor-wait" : ""
          }`}
        >
          <ArrowPathIcon
            className={`w-5 h-5 transition-transform ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Actualizando..." : "Refrescar datos"}
        </button>
      </div>

      {/* Tabla de dispositivos */}
      <div className="overflow-x-auto bg-white shadow-sm rounded-xl border border-gray-200">
        <table className="min-w-full text-left">
          <thead className="bg-gray-100 text-gray-700 text-sm font-semibold border-b">
            <tr>
              <th className="py-3 px-4">Zona / Dispositivo</th>
              <th className="py-3 px-4">Temperatura (°C)</th>
              <th className="py-3 px-4">Humedad (%)</th>
              <th className="py-3 px-4">Última actualización</th>
              <th className="py-3 px-4">Nivel de batería</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-gray-800 text-sm">
            {allRooms.map((room) => {
              getThresholds(room.name);
              const batteryLevel = Math.floor(Math.random() * 40) + 60;
              return (
                <tr key={room.name} className="hover:bg-gray-50 transition-all duration-150">
                  <td className="py-3 px-4 font-semibold text-gray-700">{room.name}</td>
                  <td className="py-3 px-4">{room.temperature.toFixed(1)}</td>
                  <td className="py-3 px-4">{room.humidity?.toFixed(1) ?? "—"}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {new Date(room.updatedAt).toLocaleString("es-DO")}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Battery50Icon className="w-4 h-4 text-gray-500" />
                      <span>{batteryLevel}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => handleViewDetails(room)}
                        title="Ver detalles"
                        className="text-blue-600 hover:text-blue-800 transition"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleOpenConfig(room)}
                        title="Configurar umbrales"
                        className="text-gray-600 hover:text-gray-900 transition"
                      >
                        <Cog6ToothIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal configuración */}
      {selectedDevice && (
        <AlertThresholdModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          deviceId={selectedDevice.name}
          currentMax={getThresholds(selectedDevice.name).maxTemp}
          currentMin={getThresholds(selectedDevice.name).minTemp}
          onSave={handleSaveThresholds}
        />
      )}

      {/* Modal detalles */}
      {selectedDevice && (
        <DeviceDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          device={selectedDevice}
        />
      )}
    </PageContainer>
  );
};

export default DevicesPage;
