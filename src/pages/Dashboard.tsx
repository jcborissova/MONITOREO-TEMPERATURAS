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
   Botón y estados vacíos
========================= */

type ButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
} & React.PropsWithChildren;

const Button: React.FC<ButtonProps> = ({ children, onClick, disabled, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={[
      "inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm transition",
      disabled
        ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
    ].join(" ")}
  >
    {children}
  </button>
);

const SkeletonCard = ({ height = 320 }: { height?: number }) => (
  <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
    <div className="space-y-4 animate-pulse">
      <div className="h-4 w-40 rounded bg-gray-200" />
      <div className="h-3 w-64 rounded bg-gray-100" />
      <div
        className="w-full rounded-xl bg-gradient-to-b from-gray-100 to-gray-200"
        style={{ height }}
      />
    </div>
  </div>
);

const EmptyState: React.FC<{
  onRetry: () => void;
  subtitle?: string;
}> = ({ onRetry, subtitle }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
      <NoSymbolIcon className="h-7 w-7 text-blue-600" />
    </div>
    <h3 className="text-lg font-semibold text-gray-800">
      Aún no hay datos para mostrar
    </h3>
    <p className="mt-1 text-sm text-gray-500">
      {subtitle ??
        "Verifica que los sensores estén enviando lecturas o intenta cargar nuevamente."}
    </p>
    <div className="mt-4 flex items-center justify-center gap-2">
      <Button onClick={onRetry} title="Volver a intentar">
        <ArrowPathIcon className="h-4 w-4" />
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
  Object.keys(historyData || {}).forEach((k) =>
    index.set(String(k).toLowerCase(), k)
  );
  return index;
};

const pickHistory = (
  sensor: any,
  historyData: HistoryDict,
  looseIndex: Map<string, string>
) => {
  const candidates = [sensor?.devEUI, sensor?.name, sensor?.deviceName]
    .map((x) => (x == null ? "" : String(x)))
    .filter(Boolean);

  for (const k of candidates) {
    if (historyData[k]) return historyData[k];
  }
  for (const k of candidates) {
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
  const [isExporting, setIsExporting] = useState(false);

  const sensors: Room[] = useMemo(
    () => (weatherSensors ?? []) as Room[],
    [weatherSensors]
  );

  const hasData = sensors.length > 0;

  const looseIndex = useMemo(
    () => buildLooseIndex(historyData || {}),
    [historyData]
  );

  // Modal de detalle
  const [selectedDevice, setSelectedDevice] = useState<Room | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Mantener referencia fresca de refreshData
  const refreshRef = useRef(refreshData);
  useEffect(() => {
    refreshRef.current = refreshData;
  }, [refreshData]);

  const isRefreshingRef = useRef(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      setIsRefreshing(true);
      await refreshRef.current?.(true); // 🔥 forzar refresh real
    } finally {
      setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, []);

  // Primera carga: si no hay sensores, intenta refrescar
  useEffect(() => {
    if (!sensors.length && !isLoading) {
      handleRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      ): "na" | "ok" | "warn" | "crit" => {
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

  /* ========= Exportación dashboard ========= */

  const exportDashboard = useCallback(
    async (format: "image" | "pdf") => {
      if (!dashboardRef.current || isExporting) return;
      const node = dashboardRef.current;

      try {
        setIsExporting(true);

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
          const pageWidth = pdf.internal.pageSize.getWidth();
          const scale = pageWidth / node.scrollWidth;
          const imgHeight = node.scrollHeight * scale;

          pdf.addImage(dataUrl, "PNG", 0, 0, pageWidth, imgHeight);
          pdf.save(`dashboard_${new Date().toISOString()}.pdf`);
        }
      } catch (error) {
        console.error(error);
        alert("No se pudo exportar el tablero. Intente nuevamente.");
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting]
  );

  /* ========= Render ========= */

  const showSkeleton = isLoading && !hasData;

  return (
    <PageContainer
      title="Dashboard General"
      description={`Umbral conexión: ${CONNECTION_THRESHOLD_MIN} min`}
    >
      {/* Header de acciones */}
      <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-gray-800 md:text-lg">
            Tablero de Monitoreo
          </h2>
          <p className="text-xs text-gray-500">
            Sensores en vivo y estado por umbrales configurados
          </p>
        </div>

        <div className="relative flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {(isRefreshing || isLoading) && (
            <div className="pointer-events-none absolute inset-0 rounded-lg bg-white/60 backdrop-blur-[1px]" />
          )}

          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refrescar lecturas"
          >
            <ArrowPathIcon
              className={[
                "h-4 w-4",
                isRefreshing ? "animate-spin" : "",
              ].join(" ")}
            />
            Refrescar
          </Button>

          <Button
            onClick={() => exportDashboard("image")}
            disabled={isRefreshing || isExporting}
            title="Exportar tablero como imagen"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            PNG
          </Button>

          <Button
            onClick={() => exportDashboard("pdf")}
            disabled={isRefreshing || isExporting}
            title="Exportar tablero en PDF"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Contenido principal */}
      <div
        ref={dashboardRef}
        className="space-y-5 sm:space-y-6"
      >
        {showSkeleton ? (
          <>
            <SkeletonCard height={200} />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
            {/* KPIs globales */}
            <DashboardKPIs
              totalZones={kpis.totalZones}
              connected={kpis.connected}
              disconnected={kpis.disconnected}
              warnings={kpis.warn}
              critical={kpis.crit}
              lastUpdateMs={kpis.lastUpdateMs}
            />

            {/* Chart principal */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">
                Temperatura y Humedad por Sensor
              </h3>
              <MultiSensorChart />
            </div>

            {/* Columna doble: efectividad + sensores */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <h3 className="mb-2 text-sm font-semibold text-gray-800">
                  Efectividad de Temperatura
                </h3>
                <TemperatureEffectivenessChart />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <h3 className="mb-2 text-sm font-semibold text-gray-800">
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
