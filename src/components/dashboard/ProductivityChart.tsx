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

// 🎨 Paleta amplia con tonos elegantes
const BASE_COLORS = [
  "#3B82F6", // azul
  "#16A34A", // verde
  "#F59E0B", // amarillo
  "#EF4444", // rojo
  "#8B5CF6", // violeta
  "#0EA5E9", // celeste
  "#E11D48", // rosado
  "#14B8A6", // turquesa
  "#F97316", // naranja
  "#6366F1", // índigo
];

const ProductivityChart: React.FC<ProductivityChartProps> = ({ rooms }) => {
  // 🔹 Preprocesar datos con colores dinámicos
  const data = useMemo(() => {
    if (!rooms || rooms.length === 0) return [];
    return rooms.map((r, i) => {
      const baseColor = BASE_COLORS[i % BASE_COLORS.length];
      const p = r.productivity ?? 0;

      // Tono ajustado según productividad
      let shade = baseColor;
      if (p >= 90) shade = baseColor; // pleno
      else if (p >= 70) shade = `${baseColor}99`; // más claro
      else shade = "#9CA3AF"; // gris neutro

      return {
        name: r.deviceName || r.name || `Zona ${i + 1}`,
        productividad: p,
        fill: shade,
      };
    });
  }, [rooms]);

  const avgProductivity =
    data.reduce((sum, d) => sum + d.productividad, 0) / (data.length || 1);

  // 🔹 Tooltip moderno
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const value = payload[0].value;
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg px-3 py-2 rounded-lg text-sm text-gray-700">
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

  if (!data.length)
    return (
      <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">
        Sin datos disponibles
      </div>
    );

  return (
    <div className="w-full h-[260px] sm:h-[320px] md:h-[380px] lg:h-[420px] bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 15, left: 10, bottom: 35 }}
          barGap={8}
        >
          {/* 🧭 Grid + Ejes */}
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{
              fontSize: 12,
              fill: "#6b7280",
              fontFamily: "Inter, sans-serif",
            }}
            angle={window.innerWidth < 600 ? -25 : 0}
            textAnchor={window.innerWidth < 600 ? "end" : "middle"}
            interval={0}
            height={window.innerWidth < 600 ? 50 : 35}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />

          {/* 🔹 Línea de promedio */}
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

          {/* 🔹 Barras con color dinámico y etiquetas */}
          <Bar
            dataKey="productividad"
            radius={[10, 10, 0, 0]}
            maxBarSize={70}
            isAnimationActive
            animationDuration={800}
          >
            <LabelList
              dataKey="productividad"
              position="top"
              formatter={(label: any) => {
                const num = typeof label === "number" ? label : Number(label ?? 0);
                return isNaN(num) ? "0%" : `${num.toFixed(0)}%`;
              }}
              style={{
                fontSize: 11,
                fill: "#374151",
                fontWeight: 500,
                fontFamily: "Inter, sans-serif",
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
