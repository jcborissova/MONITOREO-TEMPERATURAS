/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import type { Room } from "../types/types";
import { WeatherContext } from "../context/WeatherContext";
import {
  SensorsContext,
  CONNECTION_THRESHOLD_MIN,
} from "../context/SensorsContext";

import DashboardKPIs from "../components/dashboard/DashboardKPIs";
import SensorCards from "../components/dashboard/SensorCards";
import MultiSensorChart from "../components/dashboard/MultiSensorChart";
import TemperatureEffectivenessChart from "../components/dashboard/TemperatureEffectivenessChart";
import DeviceDetailsModal from "../components/devices/DeviceDetailsModal";

import PageContainer from "../components/layout/PageContainer";
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

/* =========================
   Botón y Shimmers
========================= */
const Button: React.FC<
  React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean; title?: string }>
> = ({ children, onClick, disabled, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={[
      "flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm border transition",
      disabled
        ? "text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed"
        : "text-gray-700 border-gray-300 hover:bg-gray-100",
    ].join(" ")}
  >
    {children}
  </button>
);

const SkeletonCard = ({ height = 320 }: { height?: number }) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-40 bg-gray-200 rounded" />
      <div className="h-3 w-64 bg-gray-100 rounded" />
      <div
        className="w-full bg-gradient-to-b from-gray-100 to-gray-200 rounded-xl"
        style={{ height }}
      />
    </div>
  </div>
);

const EmptyState = ({
  onRetry,
  subtitle,
}: {
  onRetry: () => void;
  subtitle?: string;
}) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
    <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-3">
      <NoSymbolIcon className="w-7 h-7 text-blue-600" />
    </div>
    <h3 className="text-lg font-semibold text-gray-800">
      Aún no hay datos para mostrar
    </h3>
    <p className="text-sm text-gray-500 mt-1">
      {subtitle ??
        "Verifica que los sensores estén enviando lecturas o intenta cargar nuevamente."}
    </p>
    <div className="mt-4 flex items-center justify-center gap-2">
      <Button onClick={onRetry} title="Volver a intentar">
        <ArrowPathIcon className="w-4 h-4" />
        Reintentar
      </Button>
    </div>
  </div>
);

/* =========================
   Utils de histórico
========================= */
type HistoryDict = Record<string, any[]>;
const buildLooseIndex = (historyData: HistoryDict) => {
  const index = new Map<string, string>();
  for (const k of Object.keys(historyData || {}))
    index.set(String(k).toLowerCase(), k);
  return index;
};
const pickHistory = (
  sensor: any,
  historyData: HistoryDict,
  looseIndex: Map<string, string>
) => {
  const cands = [sensor?.devEUI, sensor?.name, sensor?.deviceName]
    .map((x) => (x == null ? "" : String(x)))
    .filter(Boolean);
  for (const k of cands) if (historyData[k]) return historyData[k];
  for (const k of cands) {
    const real = looseIndex.get(k.toLowerCase());
    if (real && historyData[real]) return historyData[real];
  }
  return [];
};

/* =========================
   Dashboard
========================= */
const Dashboard: React.FC = () => {
  const {
    sensors: weatherSensors,
    historyData,
    isLoading,
    refreshData,
  } = useContext(WeatherContext);
  const { thresholdsByDevEui, getSmartConnection } =
    useContext(SensorsContext);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sensors = weatherSensors ?? [];
  const hasData = sensors.length > 0;
  const looseIndex = useMemo(
    () => buildLooseIndex(historyData || {}),
    [historyData]
  );

  // 👉 Estado para el modal de detalle
  const [selectedDevice, setSelectedDevice] = useState<Room | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // 🔁 Mantener la referencia más reciente de refreshData
  const refreshRef = useRef(refreshData);
  useEffect(() => {
    refreshRef.current = refreshData;
  }, [refreshData]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // forzamos refresh manual ignorando el throttle interno
      await refreshRef.current?.(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Primera carga: si no hay sensores, intenta refrescar
  useEffect(() => {
    if (!sensors.length) void handleRefresh();
     
  }, []);

  /* ========= KPIs derivados ========= */
  const kpis = useMemo(() => {
    let connected = 0;
    let warn = 0;
    let crit = 0;

    sensors.forEach((s) => {
      const hist = pickHistory(s, historyData, looseIndex);
      const conn = getSmartConnection(s, hist as any[]);
      if (conn.isConnected) connected++;

      const th =
        thresholdsByDevEui[
          (s as any).devEUI ??
            (s as any).name ??
            (s as any).deviceName ??
            ""
        ];

      const tol = th?.tolerance ?? 2;
      const inRange = (
        val: number | null | undefined,
        min?: number,
        max?: number
      ) => {
        if (val == null || !Number.isFinite(val)) return "na";
        const below = min != null && val < min;
        const above = max != null && val > max;
        if (!below && !above) return "ok";
        const near = (edge?: number) =>
          edge == null ? false : Math.abs(val - edge) <= tol;
        if ((below && near(min)) || (above && near(max))) return "warn";
        return "crit";
      };

      const t = Number((s as any).temperature);
      const h = Number((s as any).humedity ?? (s as any).humidity);
      const tState = th
        ? inRange(t, th.temperature?.min, th.temperature?.max)
        : "ok";
      const hState = th
        ? inRange(h, th.humidity?.min, th.humidity?.max)
        : "ok";

      const worst =
        [tState, hState].includes("crit")
          ? "crit"
          : [tState, hState].includes("warn")
          ? "warn"
          : "ok";

      if (worst === "crit") crit++;
      else if (worst === "warn") warn++;
    });

    return {
      totalZones: sensors.length,
      connected,
      disconnected: Math.max(0, sensors.length - connected),
      warn,
      crit,
      lastUpdateMs: Date.now(),
    };
  }, [sensors, historyData, thresholdsByDevEui, getSmartConnection, looseIndex]);

  /* ========= Exportación tablero ========= */
  const exportDashboard = async (format: "image" | "pdf") => {
    if (!dashboardRef.current) return;
    const node = dashboardRef.current;
    try {
      const dataUrl = await toPng(node, {
        backgroundColor: "#ffffff",
        quality: 1,
        cacheBust: true,
      });
      if (format === "image") {
        const link = document.createElement("a");
        link.download = `dashboard_${new Date().toISOString()}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        const pdf = new jsPDF("p", "mm", "a4");
        const width = pdf.internal.pageSize.getWidth();
        const height = (node.scrollHeight * width) / node.scrollWidth;
        pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
        pdf.save(`dashboard_${new Date().toISOString()}.pdf`);
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo exportar el tablero. Intente nuevamente.");
    }
  };

  return (
    <PageContainer
      title="Dashboard General"
      description={`Umbral conexión: ${CONNECTION_THRESHOLD_MIN} min`}
    >
      {/* Header de acciones */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-gray-800">
            Tablero de Monitoreo
          </h2>
          <p className="text-xs text-gray-500">
            Sensores en vivo y estado por umbrales configurados
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto relative">
          {(isRefreshing || isLoading) && (
            <div className="absolute inset-0 rounded-lg bg-white/60 backdrop-blur-[1px]" />
          )}
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refrescar"
          >
            <ArrowPathIcon
              className={[
                "w-4 h-4",
                isRefreshing ? "animate-spin" : "",
              ].join(" ")}
            />
            Refrescar
          </Button>
          <Button
            onClick={() => exportDashboard("image")}
            disabled={isRefreshing}
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            PNG
          </Button>
          <Button
            onClick={() => exportDashboard("pdf")}
            disabled={isRefreshing}
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Contenido */}
      <div ref={dashboardRef} className="space-y-6">
        {isLoading ? (
          <>
            <SkeletonCard height={200} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <SkeletonCard height={260} />
              <SkeletonCard height={260} />
            </div>
          </>
        ) : !hasData ? (
          <EmptyState
            onRetry={handleRefresh}
            subtitle="No se encontraron sensores registrados."
          />
        ) : (
          <>
            <DashboardKPIs
              totalZones={kpis.totalZones}
              connected={kpis.connected}
              disconnected={kpis.disconnected}
              warnings={kpis.warn}
              critical={kpis.crit}
              lastUpdateMs={kpis.lastUpdateMs}
            />

            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Temperatura y Humedad por Sensor
              </h3>
              <MultiSensorChart />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">
                  Efectividad de Temperatura
                </h3>
                <TemperatureEffectivenessChart />
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">
                  Sensores registrados
                </h3>
                <SensorCards
                  rooms={sensors as any}
                  loading={isLoading}
                  liveWindowMin={CONNECTION_THRESHOLD_MIN}
                  showControls
                  onCardClick={(room) => {
                    setSelectedDevice(room);
                    setIsDetailsOpen(true);
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de detalle de dispositivo */}
      {selectedDevice && (
        <DeviceDetailsModal
          isOpen={isDetailsOpen}
          device={selectedDevice}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}
    </PageContainer>
  );
};

export default Dashboard;
