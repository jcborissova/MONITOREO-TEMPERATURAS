/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  LabelList,
  Cell,
  ReferenceLine,
} from "recharts";
import type { Room } from "../../types/types";

interface ProductivityChartProps {
  rooms: Room[];
}

const ProductivityChart: React.FC<ProductivityChartProps> = ({ rooms }) => {
  // ✅ Preprocesamiento optimizado
  const data = useMemo(() => {
    if (!rooms || rooms.length === 0) return [];

    return rooms.map((r) => ({
      name: r.deviceName || r.name || "Zona",
      productividad: r.productivity ?? 0,
      fill:
        (r.productivity ?? 0) >= 90
          ? "#16a34a" // verde - excelente
          : (r.productivity ?? 0) >= 70
          ? "#facc15" // amarillo - aceptable
          : "#ef4444", // rojo - bajo
    }));
  }, [rooms]);

  // ✅ Promedio general para línea de referencia
  const avgProductivity =
    data.reduce((sum, d) => sum + d.productividad, 0) / (data.length || 1);

  // ✅ Tooltip personalizado elegante
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-white border border-gray-200 shadow-md px-3 py-2 rounded-lg text-sm text-gray-700">
          <p className="font-semibold text-gray-900 mb-1">{label}</p>
          <p>
            Productividad:{" "}
            <span
              className={`font-bold ${
                value >= 90
                  ? "text-green-600"
                  : value >= 70
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {value.toFixed(1)}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
        Sin datos disponibles
      </div>
    );
  }

  return (
    <div className="h-[220px] sm:h-[280px] md:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 15, left: 0, bottom: 25 }}
          barGap={6}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(0,0,0,0.05)" }}
          />

          {/* 🔹 Línea de referencia promedio */}
          <ReferenceLine
            y={avgProductivity}
            stroke="#3b82f6"
            strokeDasharray="4 3"
            label={{
              value: `Promedio ${avgProductivity.toFixed(1)}%`,
              position: "right",
              fill: "#3b82f6",
              fontSize: 12,
              fontWeight: 500,
            }}
          />

          {/* 🔹 Barras de productividad */}
          <Bar
            dataKey="productividad"
            radius={[8, 8, 0, 0]}
            isAnimationActive={true}
          >
            <LabelList
              dataKey="productividad"
              position="top"
              formatter={(value: React.ReactNode) =>
                typeof value === "number" ? `${value.toFixed(0)}%` : value
              }
              style={{
                fontSize: 10,
                fill: "#374151",
                fontWeight: 500,
              }}
            />
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProductivityChart;
