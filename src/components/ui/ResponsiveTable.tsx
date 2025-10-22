/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  EllipsisVerticalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";

interface Column {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  render?: (value: any, row: any) => React.ReactNode;
}

interface ActionOption {
  label: string;
  value: string;
}

interface ResponsiveTableProps {
  data: any[];
  columns: Column[];
  actions?: ActionOption[];
  expandableKey?: string;
  expandedRender?: (row: any) => React.ReactNode;
  emptyMessage?: string;
  title?: string;
  className?: string;
  onActionClick?: (action: string, row: any) => void;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
}

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  data,
  columns,
  actions = [],
  emptyMessage = "No hay datos disponibles.",
  title,
  className = "",
  onActionClick,
  defaultRowsPerPage = 5,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const [menuRow, setMenuRow] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState<string>("");
  const [rowsPerPage] = useState(defaultRowsPerPage);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuAnchor(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filteredData = useMemo(() => {
    let filtered = data;
    if (filterKey) filtered = filtered.filter((i) => i[filterKey]);
    if (search.trim()) {
      filtered = filtered.filter((r) =>
        Object.values(r)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }
    return filtered;
  }, [data, search, filterKey]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va === vb) return 0;
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  }, [filteredData, sortKey, sortAsc]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(sortedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title || "Datos");
    XLSX.writeFile(wb, `${title || "export"}_${Date.now()}.xlsx`);
  };

  const openMenu = (row: any, btn: HTMLButtonElement) => {
    const rect = btn.getBoundingClientRect();
    setMenuAnchor(rect);
    setMenuRow(row);
  };
  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };

  const ActionMenu = () =>
    menuAnchor &&
    createPortal(
      <div
        ref={menuRef}
        className="fixed bg-white border border-gray-200 shadow-2xl rounded-lg z-[99999] text-sm animate-fadeIn"
        style={{
          top: menuAnchor.bottom + 4,
          left: Math.min(menuAnchor.left, window.innerWidth - 200),
          width: 180,
        }}
      >
        {actions.length > 0 ? (
          actions.map((a) => (
            <button
              key={a.value}
              onClick={() => {
                onActionClick?.(a.value, menuRow);
                closeMenu();
              }}
              className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700"
            >
              {a.label}
            </button>
          ))
        ) : (
          <div className="px-4 py-2 text-gray-400">Sin acciones</div>
        )}
      </div>,
      document.body
    );

  if (!data?.length)
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500 text-sm">
        {emptyMessage}
      </div>
    );

  return (
    <div
      className={`bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 border-b bg-gray-50">
        {title && <h3 className="font-semibold text-lg text-gray-800">{title}</h3>}

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-1 min-w-[140px]">
            <MagnifyingGlassIcon className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg w-full focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="relative flex-1 min-w-[140px]">
            <FunnelIcon className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <select
              value={filterKey}
              onChange={(e) => setFilterKey(e.target.value)}
              className="pl-7 pr-6 py-2 text-sm border border-gray-300 rounded-lg w-full focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">Filtrar por...</option>
              {columns.map((col) => (
                <option key={col.key} value={col.key}>
                  {col.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla (solo visible en sm y más) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => {
                    setSortKey(col.key);
                    setSortAsc((prev) =>
                      sortKey === col.key ? !prev : true
                    );
                  }}
                  className={`py-3 px-4 text-${col.align || "left"} cursor-pointer select-none whitespace-nowrap`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key &&
                      (sortAsc ? (
                        <ArrowUpIcon className="w-3 h-3 text-gray-500" />
                      ) : (
                        <ArrowDownIcon className="w-3 h-3 text-gray-500" />
                      ))}
                  </div>
                </th>
              ))}
              {actions.length > 0 && <th className="py-3 px-4 text-center">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((row, i) => (
              <tr key={i} className="hover:bg-blue-50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4 whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? "—"}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => openMenu(row, e.currentTarget as HTMLButtonElement)}
                      className="p-1 rounded-full hover:bg-gray-100"
                    >
                      <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card View (solo visible en mobile) */}
      <div className="sm:hidden divide-y divide-gray-100">
        {paginatedData.map((row, i) => (
          <div key={i} className="p-4 flex flex-col gap-2 hover:bg-blue-50 transition">
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">{col.label}</span>
                <span className="text-gray-800 font-semibold">
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? "—"}
                </span>
              </div>
            ))}

            {actions.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={(e) => openMenu(row, e.currentTarget as HTMLButtonElement)}
                  className="flex items-center gap-2 text-blue-600 text-sm hover:underline"
                >
                  <EllipsisVerticalIcon className="w-4 h-4" />
                  Acciones
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {menuAnchor && <ActionMenu />}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 border-t bg-gray-50 text-sm text-gray-600 gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Exportar
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-gray-600">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-lg border ${
                currentPage === 1
                  ? "text-gray-400 border-gray-200 cursor-not-allowed"
                  : "hover:bg-gray-100 border-gray-300"
              }`}
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-lg border ${
                currentPage === totalPages
                  ? "text-gray-400 border-gray-200 cursor-not-allowed"
                  : "hover:bg-gray-100 border-gray-300"
              }`}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveTable;
