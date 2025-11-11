import React from "react";
import { CalendarIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

interface ReportFiltersProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (range: { start: string; end: string }) => void;
  maxDate?: string;  // para limitar a hoy
}

const ReportFilters: React.FC<ReportFiltersProps> = ({
  startDate,
  endDate,
  onChange,
  maxDate,
}) => {
  const handleStart = (v: string) => {
    if (!v) return;
    // si start > end, ajusta end = start
    if (endDate && v > endDate) onChange({ start: v, end: v });
    else onChange({ start: v, end: endDate });
  };
  const handleEnd = (v: string) => {
    if (!v) return;
    // si end < start, ajusta start = end
    if (startDate && v < startDate) onChange({ start: v, end: v });
    else onChange({ start: startDate, end: v });
  };

  const todayStr = maxDate ?? new Date().toISOString().slice(0, 10);

  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-end gap-5">
      <div className="flex flex-col w-full sm:w-auto">
        <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <CalendarIcon className="w-4 h-4 text-gray-500" />
          Periodo de análisis
        </label>

        <div className="flex items-center gap-3">
          {/* Fecha inicial */}
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-40 focus-within:border-red-500 transition">
            <input
              aria-label="Fecha inicial"
              type="date"
              max={todayStr}
              value={startDate}
              onChange={(e) => handleStart(e.target.value)}
              className="w-full text-sm outline-none text-gray-700 bg-transparent"
            />
          </div>

          <ArrowRightIcon className="w-5 h-5 text-gray-400" />

          {/* Fecha final */}
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-40 focus-within:border-red-500 transition">
            <input
              aria-label="Fecha final"
              type="date"
              min={startDate}
              max={todayStr}
              value={endDate}
              onChange={(e) => handleEnd(e.target.value)}
              className="w-full text-sm outline-none text-gray-700 bg-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportFilters;
