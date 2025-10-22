/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useContext, useState } from "react";
import {
  Battery100Icon,
  Battery50Icon,
  Battery0Icon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import PageContainer from "../components/layout/PageContainer";
import AlertThresholdModal from "../components/devices/AlertThresholdModal";
import DeviceDetailsModal from "../components/devices/DeviceDetailsModal";
import { SensorsContext } from "../context/SensorsContext";
import { WeatherContext } from "../context/WeatherContext";
import ResponsiveTable from "../components/ui/ResponsiveTable";
import type { Room, Measure } from "../types/types";

interface DeviceThresholds {
  id: string;
  maxTemp?: number;
  minTemp?: number;
}

const DevicesPage: React.FC = () => {
  const { sensors, refreshSensors } = useContext(SensorsContext);
  const { historyData, allRooms } = useContext(WeatherContext);

  const [selectedDevice, setSelectedDevice] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🔧 Abrir modal de configuración
  const handleOpenConfig = (room: Room) => {
    setSelectedDevice(room);
    setIsModalOpen(true);
  };

  // 👁️ Abrir modal de detalles
  const handleViewDetails = (room: Room) => {
    if (!historyData || Object.keys(historyData).length === 0) {
      setSelectedDevice({ ...room, history: [] });
      setIsDetailsOpen(true);
      return;
    }

    const normalizeDate = (value: any): string => {
      if (!value) return new Date().toISOString();
      if (typeof value === "number")
        return new Date(value < 9999999999 ? value * 1000 : value).toISOString();
      if (typeof value === "string" && value.includes(" "))
        return new Date(value.replace(" ", "T")).toISOString();
      const parsed = new Date(value);
      return isNaN(parsed.getTime())
        ? new Date().toISOString()
        : parsed.toISOString();
    };

    const resolveDevEUIFor = (room: Room): string | null => {
      if (room.devEUI) return room.devEUI;
      const byName = allRooms.find(
        (r) =>
          r.name?.trim().toLowerCase() === room.name?.trim().toLowerCase() ||
          (r as any).deviceName?.trim().toLowerCase() ===
            room.name?.trim().toLowerCase()
      );
      return byName?.devEUI ?? null;
    };

    let key = resolveDevEUIFor(room);
    if (!key) {
      const byNameKey = Object.keys(historyData).find(
        (k) => k.trim().toLowerCase() === room.name?.trim().toLowerCase()
      );
      key = byNameKey ?? null;
    }

    const measures = key ? historyData[key] || [] : [];
    const parsedHistory: Measure[] = measures.map((m: any) => ({
      timestamp: normalizeDate(
        m.timestamp || m.created_at || m.time || m.date || new Date().toISOString()
      ),
      temperature: Number(m.temperature) || 0,
      humedity: Number(m.humedity ?? m.humidity ?? m.data?.humidity ?? 0),
    }));

    setSelectedDevice({ ...room, history: parsedHistory });
    setIsDetailsOpen(true);
  };

  // 💾 Guardar umbrales
  const handleSaveThresholds = (
    roomName: string,
    maxTemp: number,
    minTemp: number
  ) => {
    try {
      const raw = localStorage.getItem("device_thresholds");
      const parsed: DeviceThresholds[] = raw ? JSON.parse(raw) : [];
      const updated = parsed.filter((t) => t.id !== roomName);
      updated.push({ id: roomName, maxTemp, minTemp });
      localStorage.setItem("device_thresholds", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save thresholds", e);
    }
  };

  // 🔄 Refrescar sensores
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSensors();
    setIsRefreshing(false);
  };

  // 🔋 Render batería
  const renderBattery = (level?: number) => {
    if (level === undefined || level === null) return "—";
    if (level >= 80)
      return (
        <span className="flex items-center text-green-600 font-semibold">
          <Battery100Icon className="w-5 h-5 mr-1" /> {level}%
        </span>
      );
    if (level >= 40)
      return (
        <span className="flex items-center text-yellow-500 font-semibold">
          <Battery50Icon className="w-5 h-5 mr-1" /> {level}%
        </span>
      );
    return (
      <span className="flex items-center text-red-500 font-semibold">
        <Battery0Icon className="w-5 h-5 mr-1" /> {level}%
      </span>
    );
  };

  // ⚡ Render estado conectado/desconectado
  const renderConnectionStatus = (updatedAt?: string | Date) => {
    if (!updatedAt)
      return (
        <span className="flex items-center gap-1 text-red-500 font-medium">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          Desconectado
        </span>
      );

    const lastUpdate = new Date(updatedAt);
    const diffMin = (Date.now() - lastUpdate.getTime()) / 60000;
    const isConnected = diffMin <= 1000;

    return isConnected ? (
      <span className="flex items-center gap-1 text-green-600 font-medium">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        Conectado
      </span>
    ) : (
      <span className="flex items-center gap-1 text-red-500 font-medium">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        Desconectado
      </span>
    );
  };

  // 🧩 Acciones de tabla
  const handleTableAction = (action: string, room: Room) => {
    if (action === "details") handleViewDetails(room);
    if (action === "edit") handleOpenConfig(room);
  };

  return (
    <PageContainer
      title="Gestión de Dispositivos"
      description="Monitorea las zonas y configura los umbrales de temperatura y humedad."
    >
      {/* 🔄 Botón refrescar */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition ${
            isRefreshing ? "opacity-70 cursor-wait" : ""
          }`}
        >
          <ArrowPathIcon
            className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Actualizando..." : "Refrescar datos"}
        </button>
      </div>

      {/* ✅ Tabla dinámica mejorada */}
      <ResponsiveTable
        title="Dispositivos Activos"
        data={sensors}
        expandableKey="name"
        emptyMessage="No se encontraron dispositivos registrados."
        showExport={true}
        onActionClick={handleTableAction}
        actions={[
          { label: "Ver detalles", value: "details" },
          { label: "Configurar umbrales", value: "edit" },
        ]}
        columns={[
          {
            key: "name",
            label: "Zona / Dispositivo",
            align: "left",
          },
          {
            key: "devEUI",
            label: "UID",
            align: "left",
            render: (v) => v ?? "—",
          },
          {
            key: "productivity",
            label: "Batería",
            align: "left",
            render: (v) => renderBattery(v),
          },
          {
            key: "updatedAt",
            label: "Estado",
            align: "left",
            render: (v) => renderConnectionStatus(v),
          },
          {
            key: "temperature",
            label: "Temperatura (°C)",
            align: "left",
            render: (v) => (v != null ? v.toFixed(1) : "—"),
          },
        ]}
      />

      {/* ⚙️ Modales */}
      {selectedDevice && (
        <>
          <AlertThresholdModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            deviceId={selectedDevice.name}
            currentMax={undefined}
            currentMin={undefined}
            onSave={handleSaveThresholds}
          />
          <DeviceDetailsModal
            isOpen={isDetailsOpen}
            onClose={() => setIsDetailsOpen(false)}
            device={selectedDevice}
          />
        </>
      )}
    </PageContainer>
  );
};

export default DevicesPage;
