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
import { Warehouse, AlertTriangle, Activity, Droplet } from "lucide-react";

const Dashboard: React.FC = () => {
  const { climateData } = useContext(WeatherContext);

  const rooms =
    climateData?.rooms?.length && climateData.rooms.length > 0
      ? climateData.rooms
      : [
          { name: "Cuarto Frio 1", temperature: 2, humidity: 65, productivity: 95, alert: false, warning: false },
          { name: "Cuarto Frio 2", temperature: -3, humidity: 70, productivity: 60, alert: true, warning: false },
          { name: "Despacho Frio", temperature: 10, humidity: 75, productivity: 45, alert: false, warning: true },
          { name: "Zona Empaque", temperature: 15, humidity: 55, productivity: 80, alert: false, warning: false },
        ];

  const totalWarehouses = 12;
  const criticalAlerts = rooms.filter((r) => r.alert).length;
  const warningAlerts = rooms.filter((r) => r.warning).length;
  const avgProductivity =
    rooms.length > 0
      ? Math.round(rooms.reduce((acc, r) => acc + (r.productivity || 0), 0) / rooms.length)
      : 0;

  const productivityData = rooms.map((r) => ({ name: r.name, productividad: r.productivity || 0 }));
  const humidityData = rooms.map((r) => ({ name: r.name, humedad: r.humidity || 0 }));
  const pieData = [
    { name: "Normal", value: rooms.filter((r) => !r.alert && !r.warning).length },
    { name: "Advertencia", value: warningAlerts },
    { name: "Crítico", value: criticalAlerts },
  ];

  const COLORS = ["#22c55e", "#facc15", "#ef4444"];

  return (
    <div className="flex flex-col w-full h-full px-3 sm:px-6 py-4 space-y-6 sm:space-y-8 bg-gray-50">
      {/* Título */}
      <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800">
        Dashboard General
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <KPI icon={<Warehouse className="w-5 h-5 sm:w-7 sm:h-7 text-blue-600" />} label="Almacenes Activos" value={totalWarehouses} />
        <KPI icon={<AlertTriangle className="w-5 h-5 sm:w-7 sm:h-7 text-red-600" />} label="Alertas Críticas" value={criticalAlerts} valueClass="text-red-600" />
        <KPI icon={<Activity className="w-5 h-5 sm:w-7 sm:h-7 text-green-600" />} label="Productividad Promedio" value={`${avgProductivity}%`} valueClass="text-green-600" />
        <KPI icon={<Droplet className="w-5 h-5 sm:w-7 sm:h-7 text-blue-400" />} label="Zonas Monitoreadas" value={rooms.length} />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Productividad por Zona">
          <div className="h-[220px] sm:h-[280px] md:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="productividad" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Niveles de Humedad">
          <div className="h-[220px] sm:h-[280px] md:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={humidityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="humedad" stroke="#0ea5e9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Pie */}
      <Card title="Estado General de Zonas">
        <div className="h-[220px] sm:h-[280px] md:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius="70%"
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={36} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Tabla */}
      <Card title="Resumen de Zonas">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full table-auto text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 sm:px-4 py-2">Zona</th>
                <th className="px-2 sm:px-4 py-2 hidden sm:table-cell">Temp</th>
                <th className="px-2 sm:px-4 py-2 hidden sm:table-cell">Humedad</th>
                <th className="px-2 sm:px-4 py-2 hidden md:table-cell">Prod</th>
                <th className="px-2 sm:px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-2 sm:px-4 py-2 max-w-[120px] truncate">{room.name}</td>
                  <td className="px-2 sm:px-4 py-2 hidden sm:table-cell">{room.temperature} °C</td>
                  <td className="px-2 sm:px-4 py-2 hidden sm:table-cell">{room.humidity}%</td>
                  <td className="px-2 sm:px-4 py-2 hidden md:table-cell">{room.productivity}%</td>
                  <td
                    className={`px-2 sm:px-4 py-2 font-semibold ${
                      room.alert
                        ? "text-red-600"
                        : room.warning
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {room.alert ? "Crítico" : room.warning ? "Advertencia" : "Normal"}
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

// Components
const KPI: React.FC<{ icon: React.ReactNode; label: string; value: string | number; valueClass?: string }> = ({ icon, label, value, valueClass }) => (
  <div className="bg-white shadow rounded-lg p-3 sm:p-5 flex items-center gap-3">
    {icon}
    <div>
      <p className="text-gray-500 text-xs sm:text-sm">{label}</p>
      <p className={`text-lg sm:text-xl font-semibold ${valueClass || "text-gray-800"}`}>{value}</p>
    </div>
  </div>
);

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white shadow rounded-lg p-3 sm:p-5">
    <h2 className="text-sm sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">{title}</h2>
    {children}
  </div>
);

export default Dashboard;
