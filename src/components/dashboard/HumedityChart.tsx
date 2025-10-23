/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useContext, useMemo } from "react";
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
import { WeatherContext } from "../../context/WeatherContext";

// 🎨 Paleta de colores moderna y coherente
const colorPalette = [
  "#2563EB", // azul
  "#16A34A", // verde
  "#F59E0B", // dorado
  "#DC2626", // rojo
  "#9333EA", // violeta
  "#0EA5E9", // celeste
  "#E11D48", // rosado intenso
];

const HumedityChart: React.FC = () => {
  const { sensors, historyData } = useContext(WeatherContext);

  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [chartData, setChartData] = useState<any[]>([]);

  // Inicializa los dispositivos seleccionados (primeros dos por defecto)
  useEffect(() => {
    if (sensors.length > 0 && selectedDevices.length === 0) {
      setSelectedDevices(sensors.slice(0, 2).map((r) => r.devEUI || r.name));
    }
  }, [sensors]);

  // 🔹 Función robusta para parsear fechas (ISO, timestamp o formato MySQL)
  const parseDateSafe = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === "number") return new Date(value).toISOString();
    if (typeof value === "string" && value.includes(" ")) {
      const parsed = new Date(value.replace(" ", "T"));
      return isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  };

  // 🔹 Extrae valor de humedad sin importar el formato
  const getHumidityValue = (entry: any): number | null => {
    if (!entry) return null;
    return (
      entry.humedity ??
      entry.humidity ??
      entry.hum ??
      entry.data?.humidity ??
      null
    );
  };

  // 🔹 Construye dataset limpio con timestamps unificados
  const mergedData = useMemo(() => {
    if (!historyData || Object.keys(historyData).length === 0) return [];

    const timestamps = new Set<string>();
    selectedDevices.forEach((devId) => {
      const entries = historyData[devId] || [];
      entries.forEach((h: any) => {
        const validDate = parseDateSafe(h.timestamp || h.lastPowerDate || h.date);
        if (validDate) timestamps.add(validDate);
      });
    });

    const sorted = Array.from(timestamps).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return sorted.map((t) => {
      const row: Record<string, any> = {
        time: new Date(t).toLocaleTimeString("es-DO", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      selectedDevices.forEach((devId) => {
        const entry = (historyData[devId] || []).find((h: any) => {
          const parsed = parseDateSafe(h.timestamp || h.lastPowerDate || h.date);
          return parsed === t;
        });
        if (entry) row[devId] = getHumidityValue(entry);
      });

      return row;
    });
  }, [selectedDevices, historyData]);

  useEffect(() => {
    setChartData(mergedData);
  }, [mergedData]);

  // 🔹 Mapea correctamente IDs a nombres legibles
  const deviceOptions = useMemo(() => {
    return sensors.map((r) => ({
      id: r.devEUI || r.name,
      label: r.deviceName || r.name || "Sensor desconocido",
    }));
  }, [sensors]);

  // 🌧️ Render
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
      <div className="h-[280px] sm:h-[340px] md:h-[380px] mt-3 bg-white border border-gray-200 rounded-xl shadow-sm p-3">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No hay datos de humedad disponibles.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 25, bottom: 10, left: -5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                label={{
                  value: "Tiempo",
                  position: "insideBottom",
                  offset: -5,
                  fontSize: 12,
                  fill: "#6B7280",
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6B7280" }}
                label={{
                  value: "Humedad (%)",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 12,
                  fill: "#6B7280",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(17,24,39,0.9)",
                  border: "1px solid #4B5563",
                  borderRadius: "8px",
                  color: "#E5E7EB",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  `${value?.toFixed?.(1)} %`,
                  deviceOptions.find((d) => d.id === name)?.label || name,
                ]}
              />
              <Legend
                verticalAlign="top"
                align="center"
                wrapperStyle={{
                  fontSize: 12,
                  color: "#374151",
                  paddingBottom: 6,
                }}
              />

              {selectedDevices.map((deviceId, index) => {
                const color = colorPalette[index % colorPalette.length];
                const deviceInfo = sensors.find(
                  (r) => r.devEUI === deviceId || r.name === deviceId
                );

                return (
                  <Line
                    key={deviceId}
                    type="monotone"
                    dataKey={deviceId}
                    stroke={color}
                    strokeWidth={2.2}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 1.5, fill: color }}
                    connectNulls
                    name={deviceInfo?.deviceName || deviceInfo?.name || `Sensor ${index + 1}`}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default HumedityChart;
