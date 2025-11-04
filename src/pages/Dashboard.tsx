/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useContext, useRef, useState, useEffect, useCallback } from "react";
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

  /* ========= FIX: refresh infinito =========
     Guardamos la ref fresca de refreshData sin provocar renders,
     hacemos handleRefresh estable y el useEffect inicial corre una sola vez.
  */
  const refreshRef = useRef(refreshData);
  useEffect(() => {
    refreshRef.current = refreshData;
  }, [refreshData]);

  const isRefreshingRef = useRef(false);
  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return; // evita doble click / concurrencia
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
  }, []); // <- estable, no depende de refreshData

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

  /** Totales */
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
          {/* overlay sutil mientras carga para bloquear clicks */}
          {isLoading && (
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

      {/* KPIs rápidos */}
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
            <p className="text-xs text-gray-500">Críticas</p>
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
            {/* KPIs superiores (componentizados) */}
            <DashboardKPIs rooms={activeSensors} />

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
      {isLoading && (
        <div className="fixed bottom-4 right-4 px-3 py-2 rounded-lg bg-white/90 border border-gray-200 shadow-md flex items-center gap-2 backdrop-blur">
          <ArrowPathIcon className="w-4 h-4 animate-spin text-gray-600" />
          <span className="text-sm text-gray-700">Actualizando datos…</span>
        </div>
      )}
    </PageContainer>
  );
};

export default Dashboard;
