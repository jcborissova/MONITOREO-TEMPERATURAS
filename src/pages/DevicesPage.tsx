/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useContext, useState } from "react";
import {
  EyeIcon,
  Cog6ToothIcon,
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
import ResponsiveTable from "../components/ui/ResponsiveTable"; // 👈 IMPORTANTE
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
  // Thresholds are persisted to localStorage to avoid keeping an unused local state
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleOpenConfig = (room: Room) => {
    setSelectedDevice(room);
    setIsModalOpen(true);
  };

  const normalizeDate = (value: any): string => {
    if (!value) return new Date().toISOString();
    if (typeof value === "number")
      return new Date(value < 9999999999 ? value * 1000 : value).toISOString();
    if (typeof value === "string" && value.includes(" "))
      return new Date(value.replace(" ", "T")).toISOString();
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  };

  const resolveDevEUIFor = (room: Room): string | null => {
    if (room.devEUI) return room.devEUI;
    const byName = allRooms.find(
      (r) =>
        r.name?.trim().toLowerCase() === room.name?.trim().toLowerCase() ||
        (r as any).deviceName?.trim().toLowerCase() === room.name?.trim().toLowerCase()
    );
    return byName?.devEUI ?? null;
  };

  const handleViewDetails = (room: Room) => {
    if (!historyData || Object.keys(historyData).length === 0) {
      setSelectedDevice({ ...room, history: [] });
      setIsDetailsOpen(true);
      return;
    }

    let key = resolveDevEUIFor(room);
    if (!key) {
      const byNameKey = Object.keys(historyData).find(
        (k) => k.trim().toLowerCase() === room.name?.trim().toLowerCase()
      );
      key = byNameKey ?? null;
    }

    if (!key) {
      console.warn("❗ No se encontró devEUI o clave para:", room.name);
      setSelectedDevice({ ...room, history: [] });
      setIsDetailsOpen(true);
      return;
    }

    const measures = historyData[key] || [];
    const parsedHistory: Measure[] = measures.map((m: any) => {
      const timestamp =
        m.timestamp || m.created_at || m.time || m.date || new Date().toISOString();

      return {
        timestamp: normalizeDate(timestamp),
        temperature: Number(m.temperature) || 0,
        humedity: Number(m.humedity ?? m.humidity ?? m.data?.humidity ?? 0),
      };
    });

    setSelectedDevice({ ...room, history: parsedHistory });
    setIsDetailsOpen(true);
  };

  const handleSaveThresholds = (roomName: string, maxTemp: number, minTemp: number) => {
    try {
      const raw = localStorage.getItem("device_thresholds");
      const parsed: DeviceThresholds[] = raw ? JSON.parse(raw) : [];
      const updated = parsed.filter((t) => t.id !== roomName);
      updated.push({ id: roomName, maxTemp, minTemp });
      localStorage.setItem("device_thresholds", JSON.stringify(updated));
    } catch (e) {
      // fallback: log error but do not break the UI
      // eslint-disable-next-line no-console
      console.warn("Failed to save thresholds to localStorage", e);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSensors();
    setIsRefreshing(false);
  };

  const renderBattery = (level?: number) => {
    if (level === undefined || level === null) return "—";
    if (level >= 80)
      return (
        <span className="flex items-center justify-end text-green-600 font-semibold">
          <Battery100Icon className="w-5 h-5 mr-1" /> {level}%
        </span>
      );
    if (level >= 40)
      return (
        <span className="flex items-center justify-end text-yellow-500 font-semibold">
          <Battery50Icon className="w-5 h-5 mr-1" /> {level}%
        </span>
      );
    return (
      <span className="flex items-center justify-end text-red-500 font-semibold">
        <Battery0Icon className="w-5 h-5 mr-1" /> {level}%
      </span>
    );
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
          <ArrowPathIcon className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Actualizando..." : "Refrescar datos"}
        </button>
      </div>

      {/* ✅ Nueva tabla reutilizando ResponsiveTable */}
      <ResponsiveTable
        title="Dispositivos Activos"
        data={sensors}
        expandableKey="name"
        emptyMessage="No se encontraron dispositivos registrados."
        columns={[
          { key: "name", label: "Zona / Dispositivo" },
          {
            key: "temperature",
            label: "Temperatura (°C)",
            align: "right",
            render: (v) => v?.toFixed?.(1) ?? "—",
          },
          {
            key: "humedity",
            label: "Humedad (%)",
            align: "right",
            render: (v) => v?.toFixed?.(1) ?? "—",
          },
          {
            key: "productivity",
            label: "Batería",
            align: "right",
            render: (v) => renderBattery(v),
          },
          {
            key: "updatedAt",
            label: "Última actualización",
            align: "right",
            render: (v) =>
              v ? new Date(v).toLocaleString("es-DO") : "Sin datos",
          },
          {
            key: "acciones",
            label: "Acciones",
            align: "center",
            render: (_v, room) => (
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => handleViewDetails(room)}
                  className="text-blue-600 hover:text-blue-800 transition"
                >
                  <EyeIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleOpenConfig(room)}
                  className="text-gray-600 hover:text-gray-900 transition"
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                </button>
              </div>
            ),
          },
        ]}
        expandedRender={(room) => (
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              Detalles de {room.name}
            </h4>
            <p className="text-sm text-gray-600">
              Temperatura actual: {room.temperature?.toFixed(1)} °C
            </p>
            <p className="text-sm text-gray-600">
              Humedad: {room.humedity?.toFixed(1)} %
            </p>
            <p className="text-sm text-gray-600">
              Última actualización:{" "}
              {room.updatedAt
                ? new Date(room.updatedAt).toLocaleString("es-DO")
                : "Sin datos"}
            </p>
          </div>
        )}
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
