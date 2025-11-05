/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useContext, useRef, useState, useEffect, useCallback, useMemo } from "react";
import { WeatherContext } from "../context/WeatherContext";
import { SensorsContext } from "../context/SensorsContext";

import DashboardKPIs from "../components/dashboard/DashboardKPIs";
import ProductivityChart from "../components/dashboard/ProductivityChart";
import StatusPieChart from "../components/dashboard/StatusPieChart";
import ZonesTable from "../components/dashboard/ZonesTable";
import Card from "../components/dashboard/Card";
import PageContainer from "../components/layout/PageContainer";
import MultiSensorChart from "../components/dashboard/MultiSensorChart";
import TemperatureEffectivenessChart from "../components/dashboard/TemperatureEffectivenessChart";

import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";

import { locations } from "../data/Locations";
import { useNotifications } from "../hooks/useNotifications";
import type { Notification } from "../utils/notifications";

/* =========================
   Helpers visuales
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
      "flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm border transition",
      disabled
        ? "text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed"
        : "text-gray-700 border-gray-300 hover:bg-gray-100",
    ].join(" ")}
  >
    {children}
  </button>
);

const SkeletonCard = ({ height = 220 }: { height?: number }) => (
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

const SkeletonTable = () => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-48 bg-gray-200 rounded" />
      <div className="w-full h-10 bg-gray-100 rounded" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="w-full h-8 bg-gray-100 rounded" />
      ))}
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
    <h3 className="text-lg font-semibold text-gray-800">Aún no hay datos para mostrar</h3>
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
    <div className="mt-3 text-xs text-gray-400">
      Tip: revisa la conexión, la configuración de filtros o intenta con otro rango de fechas.
    </div>
  </div>
);

/* =========================
   Componente principal
========================= */
const Dashboard: React.FC = () => {
  const { refreshData } = useContext(WeatherContext);
  const { sensors } = useContext(SensorsContext);

  // 🔔 Notificaciones crudas
  const { all: notifications, loading: notifLoading } = useNotifications();

  // Estado de carga local
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>("");

  // ======= Refs para exportaciones =======
  const dashboardRef = useRef<HTMLDivElement>(null);
  const multiRef = useRef<HTMLDivElement>(null);
  const tempEffRef = useRef<HTMLDivElement>(null);
  const prodRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Sensores activos (excluye almacén/warehouse)
  const activeSensors = sensors.filter((s) => {
    const n = (s.name || (s as any).deviceName || "").toLowerCase();
    return !n.includes("almacén") && !n.includes("almacen") && !n.includes("warehouse");
  });
  const hasData = activeSensors.length > 0;

  // ✅ Conteo real de almacenes desde Locations
  const totalWarehouses =
    locations.filter((w: any) => w.active !== false).length || locations.length || 0;

  // Hora amigable
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString("es-DO", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  /* ========= FIX: refresh infinito ========= */
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
      await Promise.resolve(refreshRef.current?.());
    } catch (e) {
      console.error("Refresh error:", e);
    } finally {
      setIsLoading(false);
      isRefreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // al montar el dashboard, una sola vez
    handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Exportar tablero a PNG o PDF (global) */
  const exportDashboard = async (format: "image" | "pdf") => {
    if (!dashboardRef.current) return;
    try {
      const dataUrl = await toPng(dashboardRef.current, {
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
        const height =
          (dashboardRef.current.scrollHeight * width) /
          dashboardRef.current.scrollWidth;
        pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
        pdf.save(`dashboard_${new Date().toISOString()}.pdf`);
      }
    } catch (error) {
      console.error("Error exportando dashboard:", error);
      alert("No se pudo exportar el tablero. Intente nuevamente.");
    }
  };

  /** Totales desde sensores (para gráficos/tabla) */
  const total = activeSensors.length;
  const critical = activeSensors.filter((r) => r.alert).length;
  const warning = activeSensors.filter((r) => !r.alert && r.warning).length;
  const normal = total - (critical + warning);

  // ======= Utilidades de exportación por tarjeta (CSV/JSON demo) =======
  const csvFromRooms = (rows: any[]) => {
    if (!rows?.length) return "name,alert,warning\n";
    const head = ["name", "alert", "warning"];
    const body = rows
      .map((r) => [JSON.stringify(r.name ?? ""), r.alert ? 1 : 0, r.warning ? 1 : 0].join(","))
      .join("\n");
    return head.join(",") + "\n" + body + "\n";
  };

  /* =========================
     Cálculo de críticas ACTIVAS (deduplicadas por regla)
     Regla = (sensor_uid + metric + min + max) y valida contra valor EN VIVO
  ========================= */
  const inferMetric = (n: any): "temperature" | "humidity" | "unknown" => {
    const m = (n?.metric || "").toString().toLowerCase();
    if (m.includes("temp")) return "temperature";
    if (m.includes("hum")) return "humidity";
    const msg = (n?.message || "").toString().toLowerCase();
    if (/%|humed/i.test(msg)) return "humidity";
    if (/temp|°c|grados/i.test(msg)) return "temperature";
    return "unknown";
  };

  const getLiveValue = (
    sensor: any,
    metric: "temperature" | "humidity" | "unknown"
  ) => {
    if (!sensor) return null;
    if (metric === "temperature")
      return typeof sensor.temperature === "number" ? sensor.temperature : null;
    if (metric === "humidity")
      return typeof sensor.humedity === "number" ? sensor.humedity : null;
    return null;
  };

  const stillViolates = (
    value: number | null,
    min?: number | null,
    max?: number | null
  ) => {
    if (value == null || Number.isNaN(value)) return false;
    if (typeof max === "number" && value > max) return true;
    if (typeof min === "number" && value < min) return true;
    return false;
  };

  const { criticalActive, criticalActiveUnread } = useMemo(() => {
    const crits = (notifications || []).filter(
      (n: Notification) => n?.kind === "critical" && (n as any)?.sensor_uid
    );

    // Mapear sensores por UID (usamos devEUI como UID principal)
    const sensorByUid: Record<string, any> = {};
    for (const s of sensors) {
      const uid = (s as any).devEUI ?? (s as any).name;
      if (uid) sensorByUid[uid] = s;
    }

    type GroupKey = string;
    const latestByGroup: Record<GroupKey, any> = {};

    const getTs = (n: Notification) =>
      new Date((n as any).created_at ?? (n as any).createdAt ?? 0).getTime();

    for (const n of crits) {
      const metric = inferMetric(n);
      const min = typeof (n as any)?.threshold_min === "number" ? (n as any).threshold_min : null;
      const max = typeof (n as any)?.threshold_max === "number" ? (n as any).threshold_max : null;
      const key = `${(n as any).sensor_uid}::${metric}::${min ?? ""}::${max ?? ""}`;

      const ts = getTs(n);
      const prev = latestByGroup[key];
      if (!prev || ts > getTs(prev)) {
        latestByGroup[key] = { ...n, __metric: metric, __min: min, __max: max };
      }
    }

    let active = 0;
    let activeUnread = 0;

    for (const key of Object.keys(latestByGroup)) {
      const n = latestByGroup[key] as any;
      const sensor = sensorByUid[n.sensor_uid];
      const current = getLiveValue(sensor, n.__metric);

      if (stillViolates(current, n.__min, n.__max)) {
        active += 1;
        if (!n.is_read) activeUnread += 1;
      }
    }

    return { criticalActive: active, criticalActiveUnread: activeUnread };
  }, [notifications, sensors]);

  return (
    <PageContainer
      title="Dashboard General"
      description="Monitorea el estado general de los sensores, niveles de temperatura y humedad."
    >
      {/* Encabezado */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-gray-800">
            Tablero de Monitoreo
          </h2>
          <p className="text-xs text-gray-500">{currentTime}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto relative">
          {(isLoading || notifLoading) && (
            <div className="absolute inset-0 rounded-lg bg-white/60 backdrop-blur-[1px]" />
          )}
          <Button onClick={handleRefresh} disabled={isLoading} title="Refrescar">
            <ArrowPathIcon className={["w-4 h-4", isLoading ? "animate-spin" : ""].join(" ")} />
            Refrescar
          </Button>
          <Button onClick={() => exportDashboard("image")} disabled={isLoading} title="Exportar PNG">
            <ArrowDownTrayIcon className="w-4 h-4" />
            PNG
          </Button>
          <Button onClick={() => exportDashboard("pdf")} disabled={isLoading} title="Exportar PDF">
            <ArrowDownTrayIcon className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* KPIs rápidos (mini) */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-lg p-3 text-center animate-pulse"
            >
              <div className="h-3 w-20 bg-gray-200 rounded mx-auto mb-2" />
              <div className="h-6 w-10 bg-gray-100 rounded mx-auto" />
            </div>
          ))}
        </div>
      ) : hasData ? (
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3 mb-6 text-center">
          <div className="bg-gray-50 py-2 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Normales</p>
            <p className="text-green-600 font-semibold text-lg sm:text-xl">{normal}</p>
          </div>
          <div className="bg-gray-50 py-2 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Advertencia</p>
            <p className="text-yellow-600 font-semibold text-lg sm:text-xl">{warning}</p>
          </div>
          <div className="bg-gray-50 py-2 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Críticas (sensores)</p>
            <p className="text-red-600 font-semibold text-lg sm:text-xl">{critical}</p>
          </div>
        </div>
      ) : null}

      {/* Contenido principal */}
      <div ref={dashboardRef} className="space-y-6">
        {isLoading ? (
          <>
            <SkeletonCard height={360} />
            <SkeletonCard height={260} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <SkeletonCard height={240} />
              <SkeletonCard height={240} />
            </div>
            <SkeletonTable />
          </>
        ) : !hasData ? (
          <EmptyState
            onRetry={handleRefresh}
            subtitle="No se encontraron lecturas recientes de sensores. Puedes reintentar o verificar la configuración."
          />
        ) : (
          <>
            {/* KPIs superiores — con notificaciones activas deduplicadas */}
            <DashboardKPIs
              rooms={activeSensors}
              totalWarehouses={totalWarehouses}
              loading={isLoading || notifLoading}
              /** 👇 Solo cuenta las alertas que SIGUEN activas (deduplicadas por regla) */
              criticalCountOverride={criticalActive}
              criticalUnreadOverride={criticalActiveUnread}
            />

            {/* Gráfico principal */}
            <Card
              title="Temperatura y Humedad por Sensor"
              expandable
              exportable
              exportRef={multiRef}
              exportOptions={{
                filename: "temperatura-humedad",
                getJSON: () => ({
                  sensors: activeSensors.map((s) => s.name),
                  exportedAt: new Date().toISOString(),
                }),
              }}
            >
              <div ref={multiRef}>
                <MultiSensorChart />
              </div>
            </Card>

            {/* Efectividad de temperatura */}
            <Card
              title="Efectividad Promedio de Temperatura"
              expandable
              exportable
              exportRef={tempEffRef}
              exportOptions={{
                filename: "efectividad-temperatura",
                getJSON: () => ({ exportedAt: new Date().toISOString() }),
              }}
            >
              <div ref={tempEffRef}>
                <TemperatureEffectivenessChart />
              </div>
            </Card>

            {/* Productividad + Estados */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card
                title="Productividad por Sensor"
                expandable
                exportable
                exportRef={prodRef}
                exportOptions={{
                  filename: "productividad-sensores",
                  getCSV: () => csvFromRooms(activeSensors),
                }}
              >
                <div ref={prodRef}>
                  <ProductivityChart rooms={activeSensors} />
                </div>
              </Card>

              <Card
                title="Estado General de Sensores"
                expandable
                exportable
                exportRef={statusRef}
                exportOptions={{
                  filename: "estado-sensores",
                  getJSON: () => ({
                    totals: { total, normal, warning, critical },
                    exportedAt: new Date().toISOString(),
                  }),
                }}
              >
                <div ref={statusRef}>
                  <StatusPieChart rooms={activeSensors} />
                </div>
              </Card>
            </div>

            {/* Tabla resumen */}
            <Card
              title="Resumen Detallado de Sensores"
              scrollX
              expandable
              exportable
              exportRef={tableRef}
              exportOptions={{
                filename: "resumen-sensores",
                getCSV: () => csvFromRooms(activeSensors),
                getJSON: () => activeSensors,
              }}
            >
              <div ref={tableRef} className="overflow-x-auto">
                <ZonesTable rooms={activeSensors} />
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Aviso abajo si está cargando (ligero) */}
      {(isLoading || notifLoading) && (
        <div className="fixed bottom-4 right-4 px-3 py-2 rounded-lg bg-white/90 border border-gray-200 shadow-md flex items-center gap-2 backdrop-blur">
          <ArrowPathIcon className="w-4 h-4 animate-spin text-gray-600" />
          <span className="text-sm text-gray-700">Actualizando datos…</span>
        </div>
      )}
    </PageContainer>
  );
};

export default Dashboard;
