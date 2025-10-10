import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import DeviceSelector from "./DeviceSelector";
import TimeRangeSelector from "./TimeRangeSelector";

// Ejemplo de data simulada (puedes reemplazarla por tu API o context)
const mockHumidityData = [
  { time: "08:00", "DVC-001": 60, "DVC-002": 70, "DVC-003": 75 },
  { time: "09:00", "DVC-001": 65, "DVC-002": 68, "DVC-003": 74 },
  { time: "10:00", "DVC-001": 63, "DVC-002": 66, "DVC-003": 73 },
  { time: "11:00", "DVC-001": 64, "DVC-002": 65, "DVC-003": 72 },
  { time: "12:00", "DVC-001": 66, "DVC-002": 69, "DVC-003": 75 },
  { time: "13:00", "DVC-001": 68, "DVC-002": 71, "DVC-003": 76 },
];

const deviceOptions = [
  { id: "DVC-001", label: "Zona Norte" },
  { id: "DVC-002", label: "Zona Este" },
  { id: "DVC-003", label: "Zona Sur" },
];

const colorPalette = ["#2563eb", "#059669", "#f97316", "#9333ea"];

const HumidityChart: React.FC = () => {
  const [selectedDevices, setSelectedDevices] = useState<string[]>([
    "DVC-001",
    "DVC-002",
  ]);
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [filteredData, setFilteredData] = useState(mockHumidityData);

  useEffect(() => {
    // Simula filtrado por rango de tiempo
    if (timeRange === "24h") setFilteredData(mockHumidityData);
    else if (timeRange === "7d") setFilteredData(mockHumidityData.slice(0, 5));
    else setFilteredData(mockHumidityData);
  }, [timeRange]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <DeviceSelector
          devices={deviceOptions}
          selected={selectedDevices}
          onChange={setSelectedDevices}
        />
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Gráfico */}
      <div className="h-[260px] sm:h-[320px] md:h-[360px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              label={{
                value: "Tiempo",
                position: "insideBottom",
                offset: -5,
                fontSize: 11,
              }}
            />
            <YAxis
              label={{
                value: "Humedad (%)",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
              }}
            />
            <Tooltip />
            <Legend />

            {selectedDevices.map((deviceId, index) => (
              <Line
                key={deviceId}
                type="monotone"
                dataKey={deviceId}
                stroke={colorPalette[index % colorPalette.length]}
                strokeWidth={2.5}
                dot={false}
                name={
                  deviceOptions.find((d) => d.id === deviceId)?.label ||
                  deviceId
                }
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HumidityChart;
