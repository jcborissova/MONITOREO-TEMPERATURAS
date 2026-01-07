/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
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

import { WeatherContext } from "../context/WeatherContext";
import type { Room, Measure } from "../types/types";
import {
  SensorsContext,
  CONNECTION_THRESHOLD_MIN, // ← umbral unificado (ej. 30 min)
  type ConnInfo,
} from "../context/SensorsContext";

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
    <h3 className="text-lg font-semibold text-gray-800">
      No hay dispositivos para mostrar
    </h3>
    <p className="text-sm text-gray-500 mt-1">
      Aún no se han registrado sensores o no se detectaron lecturas recientes en
      la ventana de {CONNECTION_THRESHOLD_MIN} minutos.
    </p>
    <div className="mt-5">
      <Button onClick={onRetry}>
        <ArrowPathIcon className="w-4 h-4" />
        Reintentar
      </Button>
    </div>
    <p className="text-xs text-gray-400 mt-3">
      Tip: verifica la conexión de los dispositivos, la alimentación eléctrica y
      la configuración del sistema.
    </p>
  </div>
);

/* =========================
   Helpers de formato
========================= */
const formatRelative = (min: number) => {
  if (!isFinite(min)) return "";
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${Math.floor(min)} min`;
  const h = min / 60;
  if (h < 24) return `${Math.floor(h)} h`;
  const d = h / 24;
  return `${Math.floor(d)} d`;
};

const formatDateTime = (date: Date | null | undefined) => {
  if (!date) return "desconocido";
  try {
    return date.toLocaleString("es-DO", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "desconocido";
  }
};

const renderConnectionStatus = (conn: ConnInfo | null | undefined) => {
  if (!conn) {
    return (
      <span className="text-xs text-gray-400">
        Sin información de conexión disponible
      </span>
    );
  }

  if (conn.isConnected) {
    return (
      <div className="flex flex-col">
        <span className="flex items-center gap-1 text-green-600 font-medium">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Conectado
        </span>
        <span className="text-xs text-gray-500">
          Última lectura: {formatDateTime(conn.last)}{" "}
          {isFinite(conn.diffMin) && (
            <span className="text-gray-400">
              (hace {formatRelative(conn.diffMin)})
            </span>
          )}
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
        Última conexión: {formatDateTime(conn.last)}{" "}
        {isFinite(conn.diffMin) && (
          <span className="text-gray-400">
            (hace {formatRelative(conn.diffMin)})
          </span>
        )}
      </span>
    </div>
  );
};

const renderBattery = (
  level: number | undefined | null,
  isConnected: boolean
) => {
  if (!isConnected) {
    return (
      <span className="flex items-center text-gray-400 font-medium">
        <NoSymbolIcon className="w-5 h-5 mr-1" />
        Offline
      </span>
    );
  }
  if (level == null || Number.isNaN(level)) return "—";

  const pct = Math.max(0, Math.min(100, Math.round(Number(level))));

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
   Helpers de datos (history / meta)
========================= */

// Clave “principal” de un dispositivo para buscar en history
const getDeviceKey = (row: Room): string | null => {
  return (
    row.devEUI ||
    row.name ||
    (row as any).deviceName ||
    (row as any).id ||
    null
  );
};

// Busca history usando devEUI / name / deviceName (similar al dashboard)
const pickHistoryForDevice = (
  row: Room,
  historyData: Record<string, any[]>
): Measure[] => {
  const candidates = [
    row.devEUI,
    row.name,
    (row as any).deviceName,
  ].filter(Boolean) as string[];

  for (const key of candidates) {
    if (historyData[key]) return historyData[key] as Measure[];
  }

  // fallback: búsqueda case-insensitive
  const lowerIndex = new Map<string, string>();
  Object.keys(historyData || {}).forEach((k) =>
    lowerIndex.set(k.toLowerCase(), k)
  );

  for (const key of candidates) {
    const real = lowerIndex.get(key.toLowerCase());
    if (real && historyData[real]) return historyData[real] as Measure[];
  }

  return [];
};

interface DeviceMeta {
  conn: ConnInfo | null;
  battery: number | null;
  temperature: number | null;
  humidity: number | null;
}

const computeDeviceMeta = (
  devices: Room[],
  historyData: Record<string, any[]>,
  getSmartConnection: (room: Room, history: any[]) => ConnInfo
) => {
  const meta = new Map<string, DeviceMeta>();

  devices.forEach((row) => {
    const key = getDeviceKey(row);
    if (!key) return;

    const history = pickHistoryForDevice(row, historyData);
    const conn = getSmartConnection(row, history as any[]);

    const rawBattery =
      (row as any).battery ??
      (row as any).batteryPct ??
      (row as any).lastPower ??
      (row as any).productivity ??
      null;

    const battery = Number.isFinite(Number(rawBattery))
      ? Number(rawBattery)
      : null;

    const rawTemp =
      (row as any).temperature ??
      (history[history.length - 1] as any)?.temperature ??
      null;

    const rawHum =
      (row as any).humedity ??
      (row as any).humidity ??
      (history[history.length - 1] as any)?.humidity ??
      (history[history.length - 1] as any)?.humedity ??
      (history[history.length - 1] as any)?.data?.humidity ??
      null;

    const temperature =
      rawTemp != null && !Number.isNaN(Number(rawTemp))
        ? Number(rawTemp)
        : null;
    const humidity =
      rawHum != null && !Number.isNaN(Number(rawHum))
        ? Number(rawHum)
        : null;

    meta.set(String(key), {
      conn,
      battery,
      temperature,
      humidity,
    });
  });

  return meta;
};

/* =========================
   Componente principal
========================= */
const DevicesPage: React.FC = () => {
  const {
    sensors,
    historyData,
    isLoading: weatherLoading,
    refreshData,
  } = useContext(WeatherContext);
  const { getSmartConnection } = useContext(SensorsContext);

  const [selectedDevice, setSelectedDevice] = useState<Room | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [configDeviceId, setConfigDeviceId] = useState<string>("");
  const [configDeviceLabel, setConfigDeviceLabel] = useState<string>("");

  // Filtramos zonas generales (si las tienes como sensores "macro")
  const tableData = useMemo(
    () =>
      (sensors || []).filter((s) => {
        const n = (s.name || (s as any).deviceName || "")
          .toString()
          .toLowerCase();
        return (
          !n.includes("almacén") &&
          !n.includes("almacen") &&
          !n.includes("warehouse")
        );
      }),
    [sensors]
  );

  const hasData = tableData.length > 0;

  // Precomputar meta por dispositivo (conn, batería, lecturas)
  const deviceMeta = useMemo(
    () => computeDeviceMeta(tableData, historyData || {}, getSmartConnection),
    [tableData, historyData, getSmartConnection]
  );

  /* ========= Refresh control (con ref para evitar re-renders) ========= */
  const refreshRef = useRef(refreshData);
  useEffect(() => {
    refreshRef.current = refreshData;
  }, [refreshData]);

  const isRefreshingRef = useRef(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      setIsLoading(true);
      // 🔥 FORZAR REFRESH REAL (no importa el throttle)
      await refreshRef.current?.(true);
    } finally {
      setIsLoading(false);
      isRefreshingRef.current = false;
    }
  }, []);


  // Primera carga
  useEffect(() => {
    handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showLoading = weatherLoading || isLoading;

  /* ========= Actions tabla ========= */
  const handleViewDetails = (row: Room) => {
    // El modal ya usa WeatherContext para reconstruir history, así que basta pasar el Room
    setSelectedDevice(row);
    setIsDetailsOpen(true);
  };

  const handleOpenConfig = (row: Room) => {
    const id =
      row.devEUI ||
      row.name ||
      (row as any).deviceName ||
      (row as any).id ||
      "";

    const label =
      row.name ||
      (row as any).deviceName ||
      "Sensor sin nombre";

    setConfigDeviceId(String(id));
    setConfigDeviceLabel(label);
  };

  const handleTableAction = (action: string, row: Room) => {
    if (action === "details") return handleViewDetails(row);
    if (action === "edit") return handleOpenConfig(row);
  };

  /* ========= Render ========= */
  const totalDevices = tableData.length;

  return (
    <PageContainer
      title="Gestión de Dispositivos"
      description={`Monitorea los sensores y configura umbrales. La ventana de conexión actual es de ${CONNECTION_THRESHOLD_MIN} minutos.`}
    >
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="text-xs sm:text-sm text-gray-500">
          {totalDevices > 0 ? (
            <>
              <span className="font-semibold text-gray-700">
                {totalDevices}
              </span>{" "}
              dispositivo{totalDevices === 1 ? "" : "s"} activos en esta vista.
            </>
          ) : (
            "No hay dispositivos filtrados para esta vista."
          )}
        </div>

        <div className="relative inline-flex">
          {showLoading && (
            <div className="absolute inset-0 rounded-lg bg-white/60 backdrop-blur-[1px]" />
          )}
          <Button
            onClick={handleRefresh}
            disabled={showLoading}
            title="Actualizar datos de los dispositivos"
          >
            <ArrowPathIcon
              className={[
                "w-5 h-5",
                showLoading ? "animate-spin text-gray-600" : "",
              ].join(" ")}
            />
            {showLoading ? "Actualizando..." : "Refrescar datos"}
          </Button>
        </div>
      </div>

      {/* Contenido */}
      {showLoading ? (
        <SkeletonTable />
      ) : !hasData ? (
        <EmptyState onRetry={handleRefresh} />
      ) : (
        <ResponsiveTable
          title="Dispositivos activos"
          data={tableData}
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
              render: (_v: unknown, row: Room) => {
                const uid =
                  row.devEUI ||
                  (row as any).deviceName ||
                  (row as any).id ||
                  null;

                return (
                  <div className="max-w-[260px]">
                    <div className="font-semibold text-gray-900">
                      {row.name || (row as any).deviceName || "Sensor"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {uid ? `UID: ${uid}` : "UID no disponible"}
                    </div>
                  </div>
                );
              },
            },
            {
              key: "battery",
              label: "Batería",
              align: "left",
              render: (_v: unknown, row: Room) => {
                const key = getDeviceKey(row);
                if (!key) return "—";
                const meta = deviceMeta.get(String(key));
                if (!meta) return "—";
                return renderBattery(meta.battery, !!meta.conn?.isConnected);
              },
            },
            {
              key: "estado",
              label: "Estado",
              align: "left",
              render: (_v: unknown, row: Room) => {
                const key = getDeviceKey(row);
                if (!key) return null;
                const meta = deviceMeta.get(String(key));
                return renderConnectionStatus(meta?.conn ?? null);
              },
            },
            {
              key: "temperature",
              label: "Temperatura (°C)",
              align: "right",
              render: (_v: unknown, row: Room) => {
                const key = getDeviceKey(row);
                if (!key) return "—";
                const meta = deviceMeta.get(String(key));
                if (!meta?.conn?.isConnected) return "—";
                return meta.temperature != null
                  ? meta.temperature.toFixed(1)
                  : "—";
              },
            },
            {
              key: "humedity",
              label: "Humedad (%RH)",
              align: "right",
              render: (_v: unknown, row: Room) => {
                const key = getDeviceKey(row);
                if (!key) return "—";
                const meta = deviceMeta.get(String(key));
                if (!meta?.conn?.isConnected) return "—";
                return meta.humidity != null
                  ? meta.humidity.toFixed(1)
                  : "—";
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

      <AlertThresholdModal
        isOpen={!!configDeviceId}
        deviceId={configDeviceId}
        deviceLabel={configDeviceLabel}
        onClose={() => {
          setConfigDeviceId("");
          setConfigDeviceLabel("");
        }}
      />

      {showLoading && (
        <div className="fixed bottom-4 right-4 px-3 py-2 rounded-lg bg-white/90 border border-gray-200 shadow-md flex items-center gap-2 backdrop-blur">
          <ArrowPathIcon className="w-4 h-4 animate-spin text-gray-600" />
          <span className="text-sm text-gray-700">
            Actualizando dispositivos…
          </span>
        </div>
      )}
    </PageContainer>
  );
};

export default DevicesPage;
