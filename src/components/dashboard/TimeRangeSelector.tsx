import React from "react";

interface TimeRangeSelectorProps {
  value: string;
  onChange: (range: string) => void;
}

const options = [
  { label: "Últimas 24h", value: "24h" },
  { label: "Últimos 7 días", value: "7d" },
  { label: "Rango personalizado", value: "custom" },
];

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700">Rango:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TimeRangeSelector;
