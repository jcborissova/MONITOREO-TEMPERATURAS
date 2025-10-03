/* eslint-disable @typescript-eslint/no-unused-vars */
// src/pages/Dashboard.tsx
import React, { useContext } from "react";
import { WeatherContext } from "../context/WeatherContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Warehouse,
  AlertTriangle,
  Activity,
  Droplet,
} from "lucide-react";

const Dashboard: React.FC = () => {
  const { climateData } = useContext(WeatherContext);

  // Si no hay datos del contexto, usamos MOCKS
  const rooms =
    climateData?.rooms?.length && climateData.rooms.length > 0
      ? climateData.rooms
      : [
          {
            name: "Cuarto Frio 1",
            temperature: 2,
            humidity: 65,
            productivity: 95,
            alert: false,
            warning: false,
            updatedAt: new Date().toISOString(),
          },
          {
            name: "Cuarto Frio 2",
            temperature: -3,
            humidity: 70,
            productivity: 60,
            alert: true,
            warning: false,
            updatedAt: new Date().toISOString(),
          },
          {
            name: "Despacho Frio",
            temperature: 10,
            humidity: 75,
            productivity: 45,
            alert: false,
            warning: true,
            updatedAt: new Date().toISOString(),
          },
          {
            name: "Zona Empaque",
            temperature: 15,
            humidity: 55,
            productivity: 80,
            alert: false,
            warning: false,
            updatedAt: new Date().toISOString(),
          },
        ];

  // Totales mock
  const totalWarehouses = 12;
  const criticalAlerts = rooms.filter((r) => r.alert).length;
  const warningAlerts = rooms.filter((r) => r.warning).length;
  const avgProductivity =
    rooms.length > 0
      ? Math.round(
          rooms.reduce((acc, r) => acc + (r.productivity || 0), 0) /
            rooms.length
        )
      : 0;

  // Datos para gráficos
  const productivityData = rooms.map((r) => ({
    name: r.name,
    productividad: r.productivity || 0,
  }));

  const humidityData = rooms.map((r) => ({
    name: r.name,
    humedad: r.humidity || 0,
  }));

  const pieData = [
    { name: "Normal", value: rooms.filter((r) => !r.alert && !r.warning).length },
    { name: "Advertencia", value: warningAlerts },
    { name: "Crítico", value: criticalAlerts },
  ];

  const COLORS = ["#22c55e", "#facc15", "#ef4444"];

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
        Dashboard General
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI
          icon={<Warehouse className="w-8 h-8 text-blue-600" />}
          label="Almacenes Activos"
          value={totalWarehouses}
        />
        <KPI
          icon={<AlertTriangle className="w-8 h-8 text-red-600" />}
          label="Alertas Críticas"
          value={criticalAlerts}
          valueClass="text-red-600"
        />
        <KPI
          icon={<Activity className="w-8 h-8 text-green-600" />}
          label="Productividad Promedio"
          value={`${avgProductivity}%`}
          valueClass="text-green-600"
        />
        <KPI
          icon={<Droplet className="w-8 h-8 text-blue-400" />}
          label="Zonas Monitoreadas"
          value={rooms.length}
        />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Productividad */}
        <Card title="Productividad por Zona">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="productividad" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Humedad */}
        <Card title="Niveles de Humedad">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={humidityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="humedad"
                stroke="#0ea5e9"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Pie de Estados */}
      <Card title="Estado General de Zonas">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              label
            >
              {pieData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabla Resumen */}
      <Card title="Resumen de Zonas">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2">Zona</th>
                <th className="px-4 py-2">Temperatura</th>
                <th className="px-4 py-2">Humedad</th>
                <th className="px-4 py-2">Productividad</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-2">{room.name}</td>
                  <td className="px-4 py-2">{room.temperature} °C</td>
                  <td className="px-4 py-2">{room.humidity}%</td>
                  <td className="px-4 py-2">{room.productivity}%</td>
                  <td
                    className={`px-4 py-2 font-semibold ${
                      room.alert
                        ? "text-red-600"
                        : room.warning
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {room.alert
                      ? "Crítico"
                      : room.warning
                      ? "Advertencia"
                      : "Normal"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ===== Reusable Components =====
const KPI: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueClass?: string;
}> = ({ icon, label, value, valueClass }) => (
  <div className="bg-white shadow rounded-xl p-6 flex items-center gap-4">
    {icon}
    <div>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className={`text-2xl font-semibold ${valueClass || "text-gray-800"}`}>
        {value}
      </p>
    </div>
  </div>
);

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="bg-white shadow rounded-xl p-6">
    <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
    {children}
  </div>
);

export default Dashboard;
