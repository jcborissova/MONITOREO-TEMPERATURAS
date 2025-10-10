import React from "react";
import { CalendarIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

interface ReportFiltersProps {
  startDate: string;
  endDate: string;
  onChange: (range: { start: string; end: string }) => void;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({
  startDate,
  endDate,
  onChange,
}) => {
  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-end gap-5">
      {/* Etiqueta y contenedor de inputs */}
      <div className="flex flex-col w-full sm:w-auto">
        <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <CalendarIcon className="w-4 h-4 text-gray-500" />
          Periodo de análisis
        </label>
        <div className="flex items-center gap-3">
          {/* Fecha inicial */}
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-40 focus-within:border-red-500 transition">
            <input
              type="date"
              value={startDate}
              onChange={(e) =>
                onChange({ start: e.target.value, end: endDate })
              }
              className="w-full text-sm outline-none text-gray-700"
            />
          </div>

          {/* Flecha decorativa */}
          <ArrowRightIcon className="w-5 h-5 text-gray-400" />

          {/* Fecha final */}
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-40 focus-within:border-red-500 transition">
            <input
              type="date"
              value={endDate}
              onChange={(e) =>
                onChange({ start: startDate, end: e.target.value })
              }
              className="w-full text-sm outline-none text-gray-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportFilters;
