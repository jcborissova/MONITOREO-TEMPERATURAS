import React, { useContext } from "react";
import { WeatherContext } from "../context/WeatherContext";
import DashboardKPIs from "../components/dashboard/DashboardKPIs";
import ProductivityChart from "../components/dashboard/ProductivityChart";
import StatusPieChart from "../components/dashboard/StatusPieChart";
import ZonesTable from "../components/dashboard/ZonesTable";
import Card from "../components/dashboard/Card";
import PageContainer from "../components/layout/PageContainer";
import MultiSensorChart from "../components/dashboard/MultiSensorChart";

const Dashboard: React.FC = () => {
  const { allRooms, refreshData } = useContext(WeatherContext);
  const hasData = allRooms && allRooms.length > 0;

  return (
    <PageContainer
      title="Dashboard General"
      description="Monitorea el estado general de las zonas, niveles de temperatura y humedad."
    >
      {/* Acciones rápidas */}
      <div className="flex justify-end mb-4">
        <button
          onClick={refreshData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition"
        >
          Refrescar datos
        </button>
      </div>

      {!hasData ? (
        <div className="bg-white text-center py-12 rounded-lg shadow-sm border border-gray-200 text-gray-500">
          No hay datos disponibles.
        </div>
      ) : (
        <section className="space-y-6">
          {/* KPIs principales */}
          <DashboardKPIs rooms={allRooms} />

          {/* Primera línea: gráfico combinado grande a ancho completo */}
          <Card title="Temperatura y Humedad por Zona (Tiempo Real)">
            <MultiSensorChart />
          </Card>

          {/* Segunda línea: dos columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Productividad por Zona">
              <ProductivityChart rooms={allRooms} />
            </Card>

            <Card title="Estado General de Zonas">
              <StatusPieChart rooms={allRooms} />
            </Card>
          </div>

          {/* Tabla */}
          <Card title="Resumen de Zonas">
            <ZonesTable rooms={allRooms} />
          </Card>
        </section>
      )}
    </PageContainer>
  );
};

export default Dashboard;
