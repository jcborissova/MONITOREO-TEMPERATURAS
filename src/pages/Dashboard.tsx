/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useContext, useRef, useState, useEffect } from "react";
import { WeatherContext } from "../context/WeatherContext";
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
} from "@heroicons/react/24/outline";

const Dashboard: React.FC = () => {
  const { allRooms, refreshData } = useContext(WeatherContext);
  const hasData = allRooms && allRooms.length > 0;
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState<string>("");

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

  const total = allRooms?.length ?? 0;
  const critical = allRooms?.filter((r) => r.alert).length ?? 0;
  const warning = allRooms?.filter((r) => !r.alert && r.warning).length ?? 0;
  const normal = total - (critical + warning);

  return (
    <PageContainer
      title="Dashboard General"
      description="Monitorea el estado general de las zonas, niveles de temperatura y humedad."
    >
      {/* 🔹 Encabezado del tablero */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex flex-col">
          <h2 className="text-base md:text-lg font-semibold text-gray-800">
            Tablero de Monitoreo
          </h2>
          <p className="text-xs text-gray-500">{currentTime}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={refreshData}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-700 border border-gray-300 hover:bg-gray-100 transition"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refrescar
          </button>

          <button
            onClick={() => exportDashboard("image")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-700 border border-gray-300 hover:bg-gray-100 transition"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            PNG
          </button>

          <button
            onClick={() => exportDashboard("pdf")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-700 border border-gray-300 hover:bg-gray-100 transition"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* 🔹 Resumen compacto */}
      {hasData && (
        <div className="grid grid-cols-3 gap-3 mb-6 text-center">
          <div className="bg-gray-50 py-2 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Normales</p>
            <p className="text-green-600 font-semibold text-lg">{normal}</p>
          </div>
          <div className="bg-gray-50 py-2 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Advertencia</p>
            <p className="text-yellow-600 font-semibold text-lg">{warning}</p>
          </div>
          <div className="bg-gray-50 py-2 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Críticas</p>
            <p className="text-red-600 font-semibold text-lg">{critical}</p>
          </div>
        </div>
      )}

      {/* 🔹 Contenido principal */}
      <div ref={dashboardRef} className="space-y-6">
        {!hasData ? (
          <div className="bg-white text-center py-12 rounded-lg border border-gray-200 text-gray-500">
            No hay datos disponibles.
          </div>
        ) : (
          <>
            {/* KPIs */}
            <DashboardKPIs rooms={allRooms} />

            {/* Gráficos */}
            <Card title="Temperatura y Humedad por Zona">
              <MultiSensorChart />
            </Card>

            <Card title="Efectividad Promedio de Temperatura">
              <TemperatureEffectivenessChart />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Productividad por Zona">
                <ProductivityChart rooms={allRooms} />
              </Card>

              <Card title="Estado General">
                <StatusPieChart rooms={allRooms} />
              </Card>
            </div>

            {/* Tabla final */}
            <Card title="Resumen Detallado de Zonas">
              <ZonesTable rooms={allRooms} />
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default Dashboard;
