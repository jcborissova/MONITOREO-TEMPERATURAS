import React, { useContext } from "react";
import { WeatherContext } from "../context/WeatherContext";
import DashboardKPIs from "../components/dashboard/DashboardKPIs";
import ProductivityChart from "../components/dashboard/ProductivityChart";
import HumidityChart from "../components/dashboard/HumidityChart";
import StatusPieChart from "../components/dashboard/StatusPieChart";
import ZonesTable from "../components/dashboard/ZonesTable";
import Card from "../components/dashboard/Card";
import PageContainer from "../components/layout/PageContainer";

const Dashboard: React.FC = () => {
  const { allRooms, refreshData } = useContext(WeatherContext);

  const hasData = allRooms && allRooms.length > 0;

  return (
    <PageContainer
      title="Dashboard General"
      description="Monitorea el estado general de las zonas, niveles de humedad y productividad."
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

          {/* Gráficos en dos columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Productividad por Zona">
              <ProductivityChart rooms={allRooms} />
            </Card>

            <Card title="Niveles de Humedad">
              <HumidityChart />
            </Card>
          </div>

          {/* Estado general y tabla */}
          <div className="space-y-6">
            <Card title="Estado General de Zonas">
              <StatusPieChart rooms={allRooms} />
            </Card>

            <Card title="Resumen de Zonas">
              <ZonesTable rooms={allRooms} />
            </Card>
          </div>
        </section>
      )}
    </PageContainer>
  );
};

export default Dashboard;
