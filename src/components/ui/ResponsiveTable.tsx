/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";

interface Column {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  render?: (value: any, row: any) => React.ReactNode;
}

interface ResponsiveTableProps {
  data: any[];
  columns: Column[];
  expandableKey?: string; // campo a usar para expandir detalles
  expandedRender?: (row: any) => React.ReactNode; // contenido al expandir
  emptyMessage?: string;
  title?: string;
  className?: string;
}

/**
 * 🌍 ResponsiveTable: componente universal reutilizable
 * - Soporta columnas dinámicas
 * - Modo responsive con scroll horizontal
 * - Modo “card” en pantallas pequeñas
 * - Expansión de filas opcional
 */
const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  data,
  columns,
  expandableKey,
  expandedRender,
  emptyMessage = "No hay datos disponibles.",
  title,
  className = "",
}) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden ${className}`}
    >
      {title && (
        <div className="px-4 py-3 border-b bg-gray-50 text-gray-800 font-semibold text-base">
          {title}
        </div>
      )}

      {/* 🌐 Desktop / Tablet */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 text-${col.align || "left"}`}
                >
                  {col.label}
                </th>
              ))}
              {expandedRender && (
                <th className="py-3 px-4 text-center">Detalles</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, i) => {
              const keyValue = expandableKey ? row[expandableKey] : i;
              const isExpanded = expanded === String(keyValue);

              return (
                <React.Fragment key={keyValue}>
                  <tr
                    className={`hover:bg-gray-50 ${
                      isExpanded ? "bg-gray-50" : ""
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`py-3 px-4 text-${col.align || "left"}`}
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key] ?? "—"}
                      </td>
                    ))}
                    {expandedRender && (
                      <td
                        onClick={() => toggleExpand(String(keyValue))}
                        className="py-3 px-4 text-center cursor-pointer text-blue-600 hover:text-blue-800"
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="w-4 h-4 inline" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4 inline" />
                        )}
                      </td>
                    )}
                  </tr>

                  {isExpanded && expandedRender && (
                    <tr>
                      <td colSpan={columns.length + 1} className="p-0">
                        <div className="bg-gray-50 border-t border-gray-200 p-4">
                          {expandedRender(row)}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 📱 Mobile (Cards) */}
      <div className="sm:hidden divide-y divide-gray-200">
        {data.map((row, i) => (
          <div key={i} className="p-4">
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between py-1">
                <span className="text-gray-500 text-xs">{col.label}</span>
                <span className="text-gray-800 text-sm font-medium">
                  {col.render
                    ? col.render(row[col.key], row)
                    : row[col.key] ?? "—"}
                </span>
              </div>
            ))}
            {expandedRender && (
              <button
                onClick={() => toggleExpand(String(row[expandableKey ?? i]))}
                className="mt-3 w-full text-blue-600 text-xs font-semibold flex items-center justify-center gap-1"
              >
                {expanded === String(row[expandableKey ?? i])
                  ? "Ocultar detalles"
                  : "Ver detalles"}
                {expanded === String(row[expandableKey ?? i]) ? (
                  <ChevronUpIcon className="w-3 h-3" />
                ) : (
                  <ChevronDownIcon className="w-3 h-3" />
                )}
              </button>
            )}
            {expanded === String(row[expandableKey ?? i]) && expandedRender && (
              <div className="mt-2 bg-gray-50 rounded-lg p-3 border">
                {expandedRender(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResponsiveTable;
