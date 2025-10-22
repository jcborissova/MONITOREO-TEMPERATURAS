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
  // 🔹 Preprocesar datos
  const data = useMemo(() => {
    if (!rooms || rooms.length === 0) return [];
    return rooms.map((r) => ({
      name: r.deviceName || r.name || "Zona",
      productividad: r.productivity ?? 0,
      fill:
        (r.productivity ?? 0) >= 90
          ? "#16a34a"
          : (r.productivity ?? 0) >= 70
          ? "#facc15"
          : "#ef4444",
    }));
  }, [rooms]);

  const avgProductivity =
    data.reduce((sum, d) => sum + d.productividad, 0) / (data.length || 1);

  // 🔹 Tooltip adaptativo y elegante
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg px-3 py-2 rounded-lg text-sm text-gray-700 max-w-[180px]">
          <p className="font-semibold text-gray-900 mb-1 truncate">{label}</p>
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

  // 🔹 Sin datos
  if (!data.length)
    return (
      <div className="flex items-center justify-center h-[220px] sm:h-[260px] md:h-[300px] text-gray-400 text-sm">
        Sin datos disponibles
      </div>
    );

  return (
    <div className="w-full h-[220px] sm:h-[280px] md:h-[340px] lg:h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 10,
            right: 15,
            left: 5,
            bottom: window.innerWidth < 500 ? 40 : 25,
          }}
          barGap={6}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{
              fontSize: window.innerWidth < 500 ? 10 : 12,
              fill: "#6b7280",
            }}
            angle={window.innerWidth < 600 ? -30 : 0}
            textAnchor={window.innerWidth < 600 ? "end" : "middle"}
            height={window.innerWidth < 600 ? 60 : 40}
            interval={0}
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

          {/* 🔹 Línea promedio */}
          <ReferenceLine
            y={avgProductivity}
            stroke="#3b82f6"
            strokeDasharray="4 3"
            label={{
              value: `Promedio ${avgProductivity.toFixed(1)}%`,
              position: "right",
              fill: "#3b82f6",
              fontSize: 12,
              fontWeight: 600,
            }}
          />

          {/* 🔹 Barras dinámicas */}
          <Bar
            dataKey="productividad"
            radius={[8, 8, 0, 0]}
            maxBarSize={60}
            isAnimationActive
          >
            <LabelList
              dataKey="productividad"
              position="top"
              formatter={(value: any) =>
                typeof value === "number" ? `${value.toFixed(0)}%` : value
              }
              style={{
                fontSize: window.innerWidth < 500 ? 9 : 11,
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
