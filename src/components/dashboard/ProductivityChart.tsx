import React from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import type { Room } from "../../types/types"; // ✅ usa tu tipo global
 // ✅ usa tu tipo global

interface ProductivityChartProps {
  rooms: Room[];
}

const ProductivityChart: React.FC<ProductivityChartProps> = ({ rooms }) => {
  const data = rooms.map((r) => ({
    name: r.name,
    productividad: r.productivity ?? 0, // ✅ fallback seguro
  }));

  return (
    <div className="h-[220px] sm:h-[280px] md:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="productividad" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProductivityChart;
