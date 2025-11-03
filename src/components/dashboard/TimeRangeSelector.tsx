import React from "react";
import { ClockIcon } from "@heroicons/react/24/outline";

interface TimeRangeSelectorProps {
  value: string;
  onChange: (range: string) => void;
}

const options = [
  { label: "Últimas 24 horas", value: "24h" },
  { label: "Últimos 7 días", value: "7d" },
  { label: "Últimos 30 días", value: "30d" },
  { label: "Rango personalizado", value: "custom" },
];

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-1.5 text-gray-700">
        <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
        <span className="text-sm font-medium">Rango:</span>
      </div>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none border border-gray-300 bg-white rounded-lg pl-3 pr-8 py-1.5 sm:py-2 text-sm sm:text-[15px] text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150 cursor-pointer"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* 🔽 ícono desplegable */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default TimeRangeSelector;
