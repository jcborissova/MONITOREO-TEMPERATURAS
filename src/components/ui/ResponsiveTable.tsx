/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  ChevronDownIcon,
  ChevronRightIcon as ChevronRightMiniIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";

/* =========================
   Tipos
========================= */
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
  title?: string;

  /** Acciones generales disponibles */
  actions?: ActionOption[];
  onActionClick?: (action: string, row: any) => void;

  /**
   * Permite filtrar/ajustar las acciones por fila.
   * Ej: ocultar acciones para el usuario logueado:
   * rowActionsFilter={(row, actions) => isSelf(row) ? [] : actions}
   */
  rowActionsFilter?: (row: any, actions: ActionOption[]) => ActionOption[];

  expandableKey?: string;
  expandedRender?: (row: any) => React.ReactNode;

  emptyMessage?: string;
  className?: string;

  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;

  showExport?: boolean;

  /** Props extra para header/table (clases, etc.) */
  headerProps?: React.HTMLAttributes<HTMLTableSectionElement>;
  tableProps?: React.TableHTMLAttributes<HTMLTableElement>;

  /** Loading */
  loading?: boolean;
  loadingMessage?: string;
  skeletonRows?: number;
}

/* =========================
   Helpers
========================= */
const alignClass = (a?: "left" | "center" | "right") =>
  a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

const cellAlignClass = (a?: "left" | "center" | "right") =>
  a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

const isDateLike = (v: any) =>
  v instanceof Date ||
  (typeof v === "string" && !Number.isNaN(Date.parse(v))) ||
  (typeof v === "number" && v > 0 && v < 9_999_999_999_000);

const toMs = (v: any): number => {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v < 9_999_999_999 ? v * 1000 : v;
  if (typeof v === "string") {
    const s = v.includes(" ") ? v.replace(" ", "T") : v;
    const ms = Date.parse(s);
    return Number.isNaN(ms) ? NaN : ms;
  }
  const ms = new Date(v).getTime();
  return Number.isNaN(ms) ? NaN : ms;
};

const cmpSmart = (a: any, b: any) => {
  const na = Number(a);
  const nb = Number(b);
  const aNum = Number.isFinite(na);
  const bNum = Number.isFinite(nb);
  if (aNum && bNum) return na - nb;

  const aDt = isDateLike(a) ? toMs(a) : NaN;
  const bDt = isDateLike(b) ? toMs(b) : NaN;
  if (Number.isFinite(aDt) && Number.isFinite(bDt)) return aDt - bDt;

  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

/** Skeleton celda */
const Skeleton = ({ className = "h-4 w-24" }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
);

/* =========================
   Componente
========================= */
const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  data,
  columns,
  title,
  actions = [],
  onActionClick,
  rowActionsFilter,
  expandableKey,
  expandedRender,
  emptyMessage = "No hay datos disponibles.",
  className = "",
  rowsPerPageOptions = [5, 10, 20, 50],
  defaultRowsPerPage = 5,
  showExport = false,
  headerProps,
  tableProps,
  loading = false,
  loadingMessage = "Cargando datos…",
  skeletonRows = 6,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const [menuRow, setMenuRow] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState<string>("");

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  // cerrar menú contextual
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAnchor(null);
        setMenuRow(null);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // reset página cuando cambie la data, búsqueda o filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [data, search, filterKey, rowsPerPage]);

  // Filtrado y búsqueda
  const filteredData = useMemo(() => {
    let rows = data ?? [];

    if (filterKey) {
      rows = rows.filter((i) => {
        const v = i?.[filterKey];
        if (v == null) return false;
        if (typeof v === "string") return v.trim().length > 0;
        return true;
      });
    }

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        columns.some((c) =>
          String(r?.[c.key] ?? "").toLowerCase().includes(q)
        )
      );
    }
    return rows;
  }, [data, search, filterKey, columns]);

  // Ordenamiento
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const asc = sortAsc ? 1 : -1;
    return [...filteredData].sort(
      (a, b) => asc * cmpSmart(a?.[sortKey!], b?.[sortKey!])
    );
  }, [filteredData, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));
  const pageData = sortedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Exportar Excel (solo columnas visibles)
  const handleExport = () => {
    const exportRows = sortedData.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((c) => (obj[c.label] = row[c.key]));
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title || "Datos");
    XLSX.writeFile(
      wb,
      `${(title || "export").replace(/\s+/g, "_")}_${Date.now()}.xlsx`
    );
  };

  // Menú contextual
  const openMenu = (row: any, btn: HTMLButtonElement) => {
    const rect = btn.getBoundingClientRect();
    setMenuAnchor(rect);
    setMenuRow(row);
  };
  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };

  const ActionMenu = () => {
    if (!menuAnchor || !menuRow) return null;

    const rowActions = rowActionsFilter
      ? rowActionsFilter(menuRow, actions)
      : actions;

    return createPortal(
      <div
        ref={menuRef}
        className="fixed bg-white border border-gray-200 shadow-2xl rounded-lg z-[99999] text-sm animate-fadeIn"
        style={{
          top: Math.min(menuAnchor.bottom + 4, window.innerHeight - 8 - 32),
          left: Math.min(menuAnchor.left, window.innerWidth - 200),
          width: 200,
        }}
      >
        {rowActions.length ? (
          rowActions.map((a) => (
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
  };

  if (!loading && !data?.length)
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500 text-sm">
        {emptyMessage}
      </div>
    );

  // Skeleton desktop
  const renderSkeletonDesktop = () => (
    <tbody className="divide-y divide-gray-100">
      {Array.from({ length: skeletonRows }).map((_, i) => (
        <tr key={`sk-${i}`}>
          {expandableKey && (
            <td className="py-3 px-4">
              <Skeleton className="h-4 w-4" />
            </td>
          )}
          {columns.map((c, idx) => (
            <td key={idx} className={`py-3 px-4 ${cellAlignClass(c.align)}`}>
              <Skeleton className="h-4 w-28" />
            </td>
          ))}
          {!!actions.length && (
            <td className="py-3 px-4 text-center">
              <Skeleton className="h-4 w-6 inline-block" />
            </td>
          )}
        </tr>
      ))}
    </tbody>
  );

  // Skeleton móvil
  const renderSkeletonMobile = () => (
    <div className="lg:hidden divide-y divide-gray-100">
      {Array.from({ length: Math.min(skeletonRows, 4) }).map((_, i) => (
        <div key={`skm-${i}`} className="p-4">
          <div className="flex items-start justify-between">
            <Skeleton className="h-4 w-40" />
            {!!actions.length && <Skeleton className="h-4 w-6" />}
          </div>
          <div className="mt-2 space-y-1.5">
            {columns.slice(0, 3).map((__, j) => (
              <div key={j} className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const headerRightLoadingChip = (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs border-blue-200 bg-blue-50 text-blue-700"
      title={loadingMessage}
      aria-live="polite"
    >
      <ArrowPathIcon className="w-4 h-4 animate-spin" />
      {loadingMessage}
    </div>
  );

  return (
    <div
      className={`bg-white rounded-xl shadow-md border border-gray-100 ${className}`}
    >
      {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between items-start lg:items-center gap-3 p-4 border-b bg-gray-50 rounded-t-xl">
          
          {/* IZQUIERDA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            {title && (
              <h3 className="font-semibold text-lg text-gray-800">
                {title}
              </h3>
            )}

            {loading && (
              <div className="lg:hidden">
                {headerRightLoadingChip}
              </div>
            )}
          </div>

          {/* DERECHA */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full lg:w-auto">
            
            <div className="relative w-full lg:min-w-[180px]">
              <MagnifyingGlassIcon className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
              <input
                placeholder="Buscar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={loading}
                className="pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg w-full focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              />
            </div>

            <div className="relative w-full lg:min-w-[160px]">
              <FunnelIcon className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
              <select
                value={filterKey}
                onChange={(e) => setFilterKey(e.target.value)}
                disabled={loading}
                className="pl-7 pr-6 py-2 text-sm border border-gray-300 rounded-lg w-full focus:ring-1 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
              >
                <option value="">Filtrar por…</option>
                {columns.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {loading && (
              <div className="hidden lg:block">
                {headerRightLoadingChip}
              </div>
            )}
          </div>
        </div>


      {/* Contenedor de tabla desktop */}
      <div className="hidden lg:block overflow-x-auto w-full overflow-y-visible rounded-b-xl">
        <table
          className="min-w-full text-sm text-gray-800"
          {...tableProps}
        >
          {/* merge seguro de headerProps */}
          {(() => {
            const mergedHeaderClass = `bg-gray-100 text-gray-700 font-semibold border-b ${
              headerProps?.className ?? ""
            }`;
            return (
              <thead
                {...{
                  ...headerProps,
                  className: mergedHeaderClass,
                }}
              >
                <tr>
                  {expandableKey && (
                    <th className="py-3 px-4 w-8 sticky top-0 bg-gray-100 z-[1]" />
                  )}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => {
                        if (loading) return;
                        setSortKey(col.key);
                        setSortAsc((prev) =>
                          sortKey === col.key ? !prev : true
                        );
                      }}
                      className={[
                        "py-3 px-4 cursor-pointer select-none whitespace-nowrap sticky top-0 bg-gray-100",
                        alignClass(col.align),
                        loading ? "opacity-60 cursor-default" : "",
                      ].join(" ")}
                    >
                      <div className="inline-flex items-center gap-1">
                        {col.label}
                        {!loading &&
                          sortKey === col.key &&
                          (sortAsc ? (
                            <ArrowUpIcon className="w-3 h-3 text-gray-500" />
                          ) : (
                            <ArrowDownIcon className="w-3 h-3 text-gray-500" />
                          ))}
                      </div>
                    </th>
                  ))}
                  {!!actions.length && (
                    <th className="py-3 px-4 text-center sticky top-0 bg-gray-100">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
            );
          })()}

          {loading
            ? renderSkeletonDesktop()
            : (
            <tbody className="divide-y divide-gray-100">
              {pageData.map((row, i) => {
                const idx = (currentPage - 1) * rowsPerPage + i;
                const isOpen = !!expanded[idx];

                const rowActions = rowActionsFilter
                  ? rowActionsFilter(row, actions)
                  : actions;

                return (
                  <React.Fragment key={idx}>
                    <tr className="hover:bg-blue-50 transition-colors">
                      {expandableKey && (
                        <td className="py-3 px-4">
                          <button
                            className="p-1 rounded hover:bg-gray-100"
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [idx]: !prev[idx],
                              }))
                            }
                            aria-label={
                              isOpen ? "Contraer fila" : "Expandir fila"
                            }
                          >
                            {isOpen ? (
                              <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                            ) : (
                              <ChevronRightMiniIcon className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`py-3 px-4 ${cellAlignClass(
                            col.align
                          )} whitespace-nowrap`}
                        >
                          {col.render
                            ? col.render(row[col.key], row)
                            : row[col.key] ?? "—"}
                        </td>
                      ))}
                      {!!rowActions.length && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={(e) =>
                              openMenu(
                                row,
                                e.currentTarget as HTMLButtonElement
                              )
                            }
                            className="p-1 rounded-full hover:bg-gray-100"
                          >
                            <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                          </button>
                        </td>
                      )}
                    </tr>

                    {expandableKey && expandedRender && isOpen && (
                      <tr className="bg-white">
                        <td
                          className="py-3 px-4"
                          colSpan={
                            columns.length +
                            (rowActions.length ? 2 : 1)
                          }
                        >
                          {expandedRender(row)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          )}
        </table>
      </div>

      {/* Vista móvil tipo card */}
      {loading ? (
        renderSkeletonMobile()
      ) : (
        <div className="lg:hidden divide-y divide-gray-100 rounded-b-xl">
          {pageData.map((row, i) => {
            const idx = (currentPage - 1) * rowsPerPage + i;
            const isOpen = !!expanded[idx];

            const rowActions = rowActionsFilter
              ? rowActionsFilter(row, actions)
              : actions;

            return (
              <div
                key={idx}
                className="p-4 hover:bg-blue-50 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {expandableKey ? (
                      <button
                        className="flex items-center gap-2 text-left"
                        onClick={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [idx]: !prev[idx],
                          }))
                        }
                      >
                        <span className="font-semibold text-gray-900">
                          {row[expandableKey] ?? "Detalle"}
                        </span>
                        {isOpen ? (
                          <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronRightMiniIcon className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                    ) : (
                      <span className="font-semibold text-gray-900">
                        {title ?? "Fila"}
                      </span>
                    )}
                  </div>

                  {!!rowActions.length && (
                    <button
                      onClick={(e) =>
                        openMenu(row, e.currentTarget as HTMLButtonElement)
                      }
                      className="p-1 rounded-full hover:bg-gray-100"
                    >
                      <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                    </button>
                  )}
                </div>

                <div className="mt-2 space-y-1.5">
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-500">{col.label}</span>
                      <span className="text-gray-800 font-medium text-right">
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key] ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>

                {expandableKey && expandedRender && isOpen && (
                  <div className="mt-3">{expandedRender(row)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {menuAnchor && <ActionMenu />}

      {/* Footer */}
      <div className="flex flex-col lg:flex-row justify-between items-center px-4 py-3 border-t bg-gray-50 text-sm text-gray-600 gap-3 rounded-b-xl">
        <div className="flex items-center gap-2">
          {showExport && (
            <button
              onClick={handleExport}
              disabled={loading}
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg shadow-sm ${
                loading
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Exportar
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-gray-600">Filas por página</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              disabled={loading}
              className="px-2 py-1 rounded border border-gray-300 bg-white disabled:bg-gray-100"
            >
              {rowsPerPageOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-gray-600">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={loading || currentPage === 1}
              className={`px-3 py-1 rounded-lg border ${
                loading || currentPage === 1
                  ? "text-gray-400 border-gray-200 cursor-not-allowed"
                  : "hover:bg-gray-100 border-gray-300"
              }`}
              aria-label="Anterior"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={loading || currentPage === totalPages}
              className={`px-3 py-1 rounded-lg border ${
                loading || currentPage === totalPages
                  ? "text-gray-400 border-gray-200 cursor-not-allowed"
                  : "hover:bg-gray-100 border-gray-300"
              }`}
              aria-label="Siguiente"
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
