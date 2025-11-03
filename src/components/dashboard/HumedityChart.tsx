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
  Brush,
} from "recharts";
import DeviceSelector from "./DeviceSelector";
import TimeRangeSelector from "./TimeRangeSelector";
import { WeatherContext } from "../../context/WeatherContext";

// 🎨 paleta de líneas
const colorPalette = [
  "#2563EB", // azul
  "#16A34A", // verde
  "#F59E0B", // dorado
  "#DC2626", // rojo
  "#9333EA", // violeta
  "#0EA5E9", // celeste
  "#E11D48", // rosado intenso
];

type PointRow = {
  ts: string;            // ISO real
  timeLabel: string;     // etiqueta legible
  [series: string]: any; // valores por device
};

const HumedityChart: React.FC = () => {
  const { sensors, historyData } = useContext(WeatherContext);

  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [chartData, setChartData] = useState<PointRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // por si lo quieres controlar desde fuera más adelante

  // Inicial: preselecciona los primeros 2
  useEffect(() => {
    if (sensors.length > 0 && selectedDevices.length === 0) {
      setSelectedDevices(sensors.slice(0, 2).map((r) => r.devEUI || r.name));
    }
  }, [sensors]); // eslint-disable-line

  // Parse seguro de fechas
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

  // Humedad desde distintos formatos
  const getHumidityValue = (entry: any): number | null => {
    if (!entry) return null;
    const v =
      entry.humedity ??
      entry.humidity ??
      entry.hum ??
      entry.data?.humidity ??
      null;
    return typeof v === "number" ? v : v != null ? Number(v) : null;
  };

  // Filtra por rango (regla simple de ejemplo; ajusta a tu lógica real si ya filtras del backend)
  const inRange = (tsIso: string): boolean => {
    if (!timeRange) return true;
    const ms = new Date(tsIso).getTime();
    const now = Date.now();
    const ranges: Record<string, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const span = ranges[timeRange] ?? ranges["24h"];
    return ms >= now - span;
  };

  // Construcción del dataset unificado
  const mergedData = useMemo<PointRow[]>(() => {
    if (!historyData || !selectedDevices.length) return [];

    const timestamps = new Set<string>();
    selectedDevices.forEach((devId) => {
      const entries = historyData[devId] || [];
      entries.forEach((h: any) => {
        const valid = parseDateSafe(h.timestamp || h.lastPowerDate || h.date);
        if (valid && inRange(valid)) timestamps.add(valid);
      });
    });

    const sorted = Array.from(timestamps).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    const dtf = new Intl.DateTimeFormat("es-DO", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return sorted.map((ts) => {
      const row: PointRow = {
        ts,
        timeLabel: dtf.format(new Date(ts)),
      };
      selectedDevices.forEach((devId) => {
        const entry = (historyData[devId] || []).find((h: any) => {
          const parsed = parseDateSafe(h.timestamp || h.lastPowerDate || h.date);
          return parsed === ts;
        });
        row[devId] = getHumidityValue(entry);
      });
      return row;
    });
  }, [historyData, selectedDevices, timeRange]); // eslint-disable-line

  useEffect(() => {
    setLoading(true);
    setChartData(mergedData);
    setLoading(false);
  }, [mergedData]);

  // Opciones legibles para el selector
  const deviceOptions = useMemo(
    () =>
      sensors.map((r) => ({
        id: r.devEUI || r.name,
        label: r.deviceName || r.name || "Sensor",
      })),
    [sensors]
  );

  // Cálculo del dominio Y dinámico (clamp 0–100 por defecto)
  const yDomain = useMemo<[number, number]>(() => {
    const values: number[] = [];
    chartData.forEach((row) => {
      selectedDevices.forEach((id) => {
        const v = row[id];
        if (typeof v === "number" && !isNaN(v)) values.push(v);
      });
    });
    if (!values.length) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(1, Math.round((max - min) * 0.08)); // ~8% padding
    // clamp para humedad
    return [Math.max(0, Math.floor(min - pad)), Math.min(100, Math.ceil(max + pad))];
  }, [chartData, selectedDevices]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <DeviceSelector
          devices={deviceOptions}
          selected={selectedDevices}
          onChange={setSelectedDevices}
          searchable
          showSelectAll
          className="flex-1 min-w-[260px]"
          maxSelections={6}
        />
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Gráfico */}
      <div className="h-[280px] sm:h-[340px] md:h-[380px] mt-3 bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Cargando…
          </div>
        ) : selectedDevices.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm text-center px-6">
            Selecciona al menos un dispositivo para visualizar la humedad.
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No hay datos de humedad disponibles para el rango seleccionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 24, bottom: 10, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="timeLabel"
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
                domain={yDomain}
                allowDecimals
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
                  backgroundColor: "rgba(17,24,39,0.95)",
                  border: "1px solid #4B5563",
                  borderRadius: "8px",
                  color: "#E5E7EB",
                  fontSize: "12px",
                }}
                labelFormatter={(label, payload) => {
                  // label es timeLabel; buscamos ts para mostrar fecha completa
                  const idx = payload?.[0]?.payload as PointRow | undefined;
                  const d = idx ? new Date(idx.ts) : null;
                  return d
                    ? d.toLocaleString("es-DO", {
                        year: "2-digit",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : (label as string);
                }}
                formatter={(value: any, name: string) => [
                  typeof value === "number" ? `${value.toFixed(1)} %` : "—",
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

              {/* Líneas por dispositivo */}
              {selectedDevices.map((deviceId, index) => {
                const color = colorPalette[index % colorPalette.length];
                const deviceInfo = sensors.find(
                  (r) => r.devEUI === deviceId || r.name === deviceId
                );
                const displayName =
                  deviceInfo?.deviceName || deviceInfo?.name || `Sensor ${index + 1}`;

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
                    name={displayName}
                  />
                );
              })}

              {/* Brush solo en desktop para explorar rango */}
              <Brush
                className="hidden md:block"
                dataKey="timeLabel"
                height={18}
                travellerWidth={8}
                stroke="#CBD5E1"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default HumedityChart;
