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

const colorPalette = ["#2563eb", "#059669", "#f97316", "#9333ea", "#e11d48"];

const HumedityChart: React.FC = () => {
  const { allRooms, historyData } = useContext(WeatherContext);

  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [chartData, setChartData] = useState<any[]>([]);

  // Inicializa los dispositivos seleccionados
  useEffect(() => {
    if (allRooms.length > 0 && selectedDevices.length === 0) {
      setSelectedDevices(allRooms.slice(0, 2).map((r) => r.devEUI || r.name));
    }
  }, [allRooms]);

  // 🔹 Función segura para parsear fechas (ISO, timestamp o MySQL-like)
  const parseDateSafe = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === "number") return new Date(value).toISOString();

    // convierte formato "2025-10-18 09:00:00" a ISO válido
    if (typeof value === "string" && value.includes(" ")) {
      const normalized = value.replace(" ", "T");
      const parsed = new Date(normalized);
      return isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  };

  // 🔹 Normaliza el valor de humedad sin importar cómo venga
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

  // 🔹 Construye dataset real usando historyData
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

    const sortedTimestamps = Array.from(timestamps).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return sortedTimestamps.map((t) => {
      const row: Record<string, any> = {
        time: new Date(t).toLocaleTimeString("es-DO", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      selectedDevices.forEach((devId) => {
        const entry = (historyData[devId] || []).find((h: any) => {
          const valid = parseDateSafe(h.timestamp || h.lastPowerDate || h.date);
          return valid === t;
        });
        if (entry) row[devId] = getHumidityValue(entry);
      });

      return row;
    });
  }, [selectedDevices, historyData]);

  useEffect(() => {
    setChartData(mergedData);
  }, [mergedData]);

  // 🔹 Mapea correctamente el ID real y el nombre legible
  const deviceOptions = useMemo(() => {
    return allRooms.map((r) => ({
      id: r.devEUI || r.name, // sigue usando devEUI para enlazar los datos
      label: r.name || r.deviceName || "Sin nombre", // muestra el nombre visible
    }));
  }, [allRooms]);


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
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No hay datos de humedad disponibles.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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

              {selectedDevices.map((deviceId, index) => {
                const deviceInfo = allRooms.find(
                  (r) => r.devEUI === deviceId || r.name === deviceId
                );

                return (
                  <Line
                    key={deviceId}
                    type="monotone"
                    dataKey={deviceId}
                    stroke={colorPalette[index % colorPalette.length]}
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                    name={deviceInfo?.deviceName || `Dispositivo ${index + 1}`}
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
