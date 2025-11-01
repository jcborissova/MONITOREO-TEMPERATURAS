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

/** Util: normaliza fechas */
const normalizeDate = (value: any): string => {
  if (!value) return new Date().toISOString();
  if (typeof value === "number") {
    const ms = value < 9_999_999_999 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string") {
    const s = value.includes(" ") ? value.replace(" ", "T") : value;
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

/** UI helpers */
const renderBattery = (level?: number) => {
  if (level == null || Number.isNaN(level)) return "—";
  if (level >= 80) {
    return (
      <span className="flex items-center text-green-600 font-semibold">
        <Battery100Icon className="w-5 h-5 mr-1" /> {Math.round(level)}%
      </span>
    );
  }
  if (level >= 40) {
    return (
      <span className="flex items-center text-yellow-500 font-semibold">
        <Battery50Icon className="w-5 h-5 mr-1" /> {Math.round(level)}%
      </span>
    );
  }
  return (
    <span className="flex items-center text-red-500 font-semibold">
      <Battery0Icon className="w-5 h-5 mr-1" /> {Math.round(level)}%
    </span>
  );
};

const renderConnectionStatus = (updatedAt?: string | Date) => {
  if (!updatedAt) {
    return (
      <span className="flex items-center gap-1 text-red-500 font-medium">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        Desconectado
      </span>
    );
  }
  const last = new Date(updatedAt);
  const diffMin = (Date.now() - last.getTime()) / 60000;
  const isOk = diffMin <= 5;
  return isOk ? (
    <span className="flex items-center gap-1 text-green-600 font-medium">
      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      Conectado
    </span>
  ) : (
    <span className="flex items-center gap-1 text-red-500 font-medium">
      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      Desconectado
    </span>
  );
};

const DevicesPage: React.FC = () => {
  const { sensors, refreshSensors } = useContext(SensorsContext);
  const { historyData } = useContext(WeatherContext);

  const [selectedDevice, setSelectedDevice] = useState<Room | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 👉 id real que pasa al modal (el modal se encarga de consultar el API)
  const [configDeviceId, setConfigDeviceId] = useState<string>("");

  // Quitamos el “almacén” de esta tabla (si aplica)
  const tableData = (sensors || []).filter((s) => {
    const n = (s.name || (s as any).deviceName || "").toLowerCase();
    return !n.includes("almacén") && !n.includes("almacen") && !n.includes("warehouse");
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSensors();
    setIsRefreshing(false);
  };

  const handleViewDetails = (row: Room) => {
    const keyByEui = row.devEUI ?? null;
    const keyByName = row.name ?? (row as any).deviceName ?? null;
    const rawList: any[] =
      (keyByEui && historyData[keyByEui]) ||
      (keyByName && historyData[keyByName]) ||
      [];
    const parsed: Measure[] = rawList.map((m: any) => ({
      timestamp: normalizeDate(m.timestamp || m.created_at || m.time || m.date || m.updatedAt),
      temperature: Number(m.temperature ?? 0),
      humedity: Number(m.humedity ?? m.humidity ?? m.data?.humidity ?? 0),
      productivity: Number(m.productivity ?? 0),
    }));
    setSelectedDevice({ ...row, history: parsed });
    setIsDetailsOpen(true);
  };

  const handleOpenConfig = (row: Room) => {
    const id =
      row.devEUI ||
      row.name ||
      (row as any).deviceName ||
      "";
    setConfigDeviceId(String(id));
  };

  const handleTableAction = (action: string, row: Room) => {
    if (action === "details") return handleViewDetails(row);
    if (action === "edit") return handleOpenConfig(row);
  };

  return (
    <PageContainer
      title="Gestión de Dispositivos"
      description="Monitorea los sensores y configura umbrales de temperatura y humedad."
    >
      {/* Toolbar */}
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

      {/* Tabla */}
      <ResponsiveTable
        title="Dispositivos Activos"
        data={tableData}
        expandableKey="name"
        emptyMessage="No se encontraron dispositivos registrados."
        showExport
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
            render: (_v, row) => (
              <div className="max-w-[260px]">
                <div className="font-semibold text-gray-900">
                  {row.name || (row as any).deviceName || "Sensor"}
                </div>
                <div className="text-xs text-gray-500">
                  {(row.devEUI || (row as any).deviceName)
                    ? `UID: ${row.devEUI || (row as any).deviceName}`
                    : "UID no disponible"}
                </div>
              </div>
            ),
          },
          {
            key: "battery",
            label: "Batería",
            align: "left",
            render: (_v, row) =>
              renderBattery(
                Number(
                  (row as any).battery ??
                    (row as any).lastPower ??
                    (row as any).productivity
                )
              ),
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
            align: "right",
            render: (v) =>
              v != null && !Number.isNaN(v) ? Number(v).toFixed(1) : "—",
          },
          {
            key: "humedity",
            label: "Humedad (%RH)",
            align: "right",
            render: (v, row) => {
              const h = v ?? (row as any).humidity ?? (row as any).data?.humidity ?? null;
              return h != null && !Number.isNaN(h) ? Number(h).toFixed(1) : "—";
            },
          },
        ]}
      />

      {/* Modales */}
      {selectedDevice && (
        <DeviceDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          device={selectedDevice}
        />
      )}

      {/* Modal de umbrales: hace fetch individual cuando se abre */}
      <AlertThresholdModal
        isOpen={!!configDeviceId}
        deviceId={configDeviceId}
        onClose={() => setConfigDeviceId("")}
      />
    </PageContainer>
  );
};

export default DevicesPage;
