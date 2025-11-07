/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Battery100Icon,
  Battery50Icon,
  Battery0Icon,
  ArrowPathIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";

import PageContainer from "../components/layout/PageContainer";
import AlertThresholdModal from "../components/devices/AlertThresholdModal";
import DeviceDetailsModal from "../components/devices/DeviceDetailsModal";
import ResponsiveTable from "../components/ui/ResponsiveTable";

import { SensorsContext } from "../context/SensorsContext";
import { WeatherContext } from "../context/WeatherContext";
import type { Room, Measure } from "../types/types";

/* =========================
   Utils de tiempo/fechas
========================= */
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

const getConnInfo = (updatedAt?: string | Date) => {
  if (!updatedAt) {
    return { isConnected: false, last: null as Date | null, diffMin: Infinity };
  }
  const last = new Date(updatedAt);
  const diffMin = (Date.now() - last.getTime()) / 60000;
  return { isConnected: diffMin <= 5, last, diffMin };
};

const formatLastSeen = (d: Date | null) => {
  if (!d) return "desconocido";
  return d.toLocaleString("es-DO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRelative = (min: number) => {
  if (!isFinite(min)) return "";
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${Math.floor(min)} min`;
  const h = min / 60;
  if (h < 24) return `${Math.floor(h)} h`;
  const d = h / 24;
  return `${Math.floor(d)} d`;
};

/* =========================
   UI helpers
========================= */
const Button = ({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={[
      "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition",
      disabled
        ? "text-gray-400 border-gray-200 bg-gray-50 cursor-wait"
        : "text-gray-700 border-gray-300 hover:bg-gray-100",
    ].join(" ")}
  >
    {children}
  </button>
);

const SkeletonTable = () => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-56 bg-gray-200 rounded" />
      <div className="w-full h-10 bg-gray-100 rounded" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="w-full h-9 bg-gray-100 rounded" />
      ))}
    </div>
  </div>
);

const EmptyState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center">
    <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
      <NoSymbolIcon className="w-8 h-8 text-blue-600" />
    </div>
    <h3 className="text-lg font-semibold text-gray-800">No hay dispositivos para mostrar</h3>
    <p className="text-sm text-gray-500 mt-1">
      Aún no se han registrado sensores o no se detectaron lecturas recientes.
    </p>
    <div className="mt-5">
      <Button onClick={onRetry}>
        <ArrowPathIcon className="w-4 h-4" />
        Reintentar
      </Button>
    </div>
    <p className="text-xs text-gray-400 mt-3">
      Tip: verifica la conexión de los dispositivos y la configuración del sistema.
    </p>
  </div>
);

/* =========================
   Render helpers (estado/batería)
========================= */
const renderConnectionStatus = (updatedAt?: string | Date) => {
  const { isConnected, last, diffMin } = getConnInfo(updatedAt);
  if (isConnected) {
    return (
      <div className="flex flex-col">
        <span className="flex items-center gap-1 text-green-600 font-medium">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Conectado
        </span>
        <span className="text-xs text-gray-500">
          Última lectura: {formatLastSeen(last)} (hace {formatRelative(diffMin)})
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <span className="flex items-center gap-1 text-red-500 font-medium">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        Desconectado
      </span>
      <span className="text-xs text-gray-500">
        Última conexión: {formatLastSeen(last)}
        {isFinite(diffMin) ? ` (hace ${formatRelative(diffMin)})` : ""}
      </span>
    </div>
  );
};

const renderBattery = (level: number | undefined | null, isConnected: boolean) => {
  // Si está offline: mostrar claro y con ícono de "offline"
  if (!isConnected) {
    return (
      <span className="flex items-center text-gray-400 font-medium">
        <NoSymbolIcon className="w-5 h-5 mr-1" />
        Offline
      </span>
    );
  }

  if (level == null || Number.isNaN(level)) return "—";
  const pct = Math.round(Number(level));

  if (pct >= 80) {
    return (
      <span className="flex items-center text-green-600 font-semibold">
        <Battery100Icon className="w-5 h-5 mr-1" /> {pct}%
      </span>
    );
  }
  if (pct >= 40) {
    return (
      <span className="flex items-center text-yellow-500 font-semibold">
        <Battery50Icon className="w-5 h-5 mr-1" /> {pct}%
      </span>
    );
  }
  return (
    <span className="flex items-center text-red-500 font-semibold">
      <Battery0Icon className="w-5 h-5 mr-1" /> {pct}%
    </span>
  );
};

/* =========================
   Componente principal
========================= */
const DevicesPage: React.FC = () => {
  const { sensors, refreshSensors } = useContext(SensorsContext);
  const { historyData } = useContext(WeatherContext);

  const [selectedDevice, setSelectedDevice] = useState<Room | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 👉 id real que pasa al modal (el modal se encarga de consultar el API)
  const [configDeviceId, setConfigDeviceId] = useState<string>("");

  // Filtra “almacén/warehouse” de la tabla
  const tableData = useMemo(
    () =>
      (sensors || []).filter((s) => {
        const n = (s.name || (s as any).deviceName || "").toLowerCase();
        return !n.includes("almacén") && !n.includes("almacen") && !n.includes("warehouse");
      }),
    [sensors]
  );

  const hasData = tableData.length > 0;

  // ======= FIX anti-loop: mantener referencia estable del refresco =======
  const refreshRef = useRef(refreshSensors);
  useEffect(() => {
    refreshRef.current = refreshSensors;
  }, [refreshSensors]);

  const isRefreshingRef = useRef(false);
  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      setIsLoading(true);
      await Promise.resolve(refreshRef.current?.());
    } catch (e) {
      console.error("Error al refrescar dispositivos:", e);
    } finally {
      setIsLoading(false);
      isRefreshingRef.current = false;
    }
  }, []);

  // Carga inicial una sola vez
  useEffect(() => {
    handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const id = row.devEUI || row.name || (row as any).deviceName || "";
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
      <div className="flex justify-end mb-4 relative">
        {isLoading && (
          <div className="absolute inset-0 rounded-lg bg-white/60 backdrop-blur-[1px]" />
        )}
        <Button onClick={handleRefresh} disabled={isLoading}>
          <ArrowPathIcon className={["w-5 h-5", isLoading ? "animate-spin" : ""].join(" ")} />
          {isLoading ? "Actualizando..." : "Refrescar datos"}
        </Button>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <SkeletonTable />
      ) : !hasData ? (
        <EmptyState onRetry={handleRefresh} />
      ) : (
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
              render: (_v, row) => {
                const { isConnected } = getConnInfo((row as any).updatedAt);
                const level = Number(
                  (row as any).battery ??
                  (row as any).lastPower ??
                  (row as any).productivity
                );
                return renderBattery(Number.isFinite(level) ? level : undefined, isConnected);
              },
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
              render: (v, row) => {
                const { isConnected } = getConnInfo((row as any).updatedAt);
                if (!isConnected) return "—";
                return v != null && !Number.isNaN(v) ? Number(v).toFixed(1) : "—";
              },
            },
            {
              key: "humedity",
              label: "Humedad (%RH)",
              align: "right",
              render: (v, row) => {
                const { isConnected } = getConnInfo((row as any).updatedAt);
                if (!isConnected) return "—";
                const h = v ?? (row as any).humidity ?? (row as any).data?.humidity ?? null;
                return h != null && !Number.isNaN(h) ? Number(h).toFixed(1) : "—";
              },
            },
          ]}
        />
      )}

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

      {/* Aviso flotante de carga */}
      {isLoading && (
        <div className="fixed bottom-4 right-4 px-3 py-2 rounded-lg bg-white/90 border border-gray-200 shadow-md flex items-center gap-2 backdrop-blur">
          <ArrowPathIcon className="w-4 h-4 animate-spin text-gray-600" />
          <span className="text-sm text-gray-700">Actualizando dispositivos…</span>
        </div>
      )}
    </PageContainer>
  );
};

export default DevicesPage;
