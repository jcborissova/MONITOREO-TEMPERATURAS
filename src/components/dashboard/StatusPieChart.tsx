import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import type { Room } from "../../types/types"; // ✅ usa tipo global
 // ✅ usa tipo global

interface StatusPieChartProps {
  rooms: Room[];
}

const StatusPieChart: React.FC<StatusPieChartProps> = ({ rooms }) => {
  const criticalAlerts = rooms.filter((r) => r.alert).length;
  const warningAlerts = rooms.filter((r) => r.warning).length;

  const pieData = [
    {
      name: "Normal",
      value: rooms.filter((r) => !r.alert && !r.warning).length,
    },
    { name: "Advertencia", value: warningAlerts },
    { name: "Crítico", value: criticalAlerts },
  ];

  const COLORS = ["#22c55e", "#facc15", "#ef4444"];

  return (
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
  );
};

export default StatusPieChart;
