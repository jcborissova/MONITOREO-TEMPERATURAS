/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState, useContext } from "react";
import * as XLSX from "xlsx";
import { ArrowDownTrayIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { ReportRow } from "../../pages/ReportPage"; // ajusta este import a tu ruta real
import { WeatherContext } from "../../context/WeatherContext";

/* ---------- helpers ---------- */
const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9_\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);

const parseTs = (rec: any): number => {
  const ts = rec?.timestamp ?? rec?.created_at ?? rec?.time ?? rec?.date ?? rec?.updatedAt ?? null;
  if (ts == null) return NaN;
  if (typeof ts === "number") return ts < 9_999_999_999 ? ts * 1000 : ts;
  if (typeof ts === "string") {
    const s = ts.includes(" ") ? ts.replace(" ", "T") : ts;
    const ms = Date.parse(s);
    return Number.isNaN(ms) ? NaN : ms;
  }
  const ms = new Date(ts).getTime();
  return Number.isNaN(ms) ? NaN : ms;
};

const toLocal = (ms: number) =>
  new Date(ms).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" });

/* ---------- props ---------- */
interface ExportButtonProps {
  data: ReportRow[];
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  startDate,
  endDate,
  disabled = false,
}) => {
  const { historyData } = useContext(WeatherContext);

  // UI state
  const [showModal, setShowModal] = useState(false);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [splitHistoryBySheet, setSplitHistoryBySheet] = useState(false);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const defaultName = useMemo(() => {
    const base = `Reporte_Zonas_${startDate}_a_${endDate}_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}`;
    return slug(base);
  }, [startDate, endDate]);

  const [fileName, setFileName] = useState(defaultName);

  // Rango en milisegundos (borde del día)
  const startMs = useMemo(() => new Date(`${startDate}T00:00:00`).getTime(), [startDate]);
  const endMs = useMemo(() => new Date(`${endDate}T23:59:59.999`).getTime(), [endDate]);

  // Zonas filtradas por búsqueda para la lista de selección
  const zonesForPick = useMemo(() => {
    const text = search.trim().toLowerCase();
    const base = data.map((d) => d.Zona);
    return text ? base.filter((z) => z.toLowerCase().includes(text)) : base;
  }, [data, search]);

  // Datos filtrados por selección para la hoja de “Promedios”
  const tableFiltered = useMemo(() => {
    const pick = selectedZones.length > 0 ? new Set(selectedZones) : null;
    return pick ? data.filter((d) => pick.has(d.Zona)) : data;
  }, [data, selectedZones]);

  // Conteo estimado de filas de histórico dentro del rango para feedback
  const estimatedHistoryCount = useMemo(() => {
    if (!includeHistory) return 0;
    const pick = selectedZones.length > 0 ? new Set(selectedZones) : null;
    let total = 0;
    for (const [zoneKey, arr] of Object.entries(historyData ?? {})) {
      // si hay selección, se usa Nombre de la zona (ReportRow.Zona); si historyData usa devEUI,
      // asumimos que ReportRow.__zoneCode coincide con esa key en otra capa — aquí tomamos por nombre
      if (pick && !pick.has(zoneKey) && !tableFiltered.some((r) => r.Zona === zoneKey)) continue;
      const list = Array.isArray(arr) ? arr : [];
      for (const rec of list) {
        const t = parseTs(rec);
        if (!Number.isNaN(t) && t >= startMs && t <= endMs) total++;
      }
    }
    return total;
  }, [includeHistory, historyData, selectedZones, tableFiltered, startMs, endMs]);

  const allSelected = selectedZones.length === 0 || selectedZones.length === zonesForPick.length;
  const toggleAll = () => {
    if (allSelected) setSelectedZones([]); // none
    else setSelectedZones(zonesForPick.slice()); // all visibles
  };

  const handleExport = async () => {
    try {
      if (disabled) return;
      if (!data.length) {
        alert("No hay datos para exportar.");
        return;
      }

      setIsExporting(true);
      const wb = XLSX.utils.book_new();

      // --- Hoja 1: Resumen / Metadatos ---
      {
        const now = new Date();
        const rows = [
          ["Reporte de zonas", ""],
          ["Generado en", toLocal(now.getTime())],
          ["Rango", `${startDate} a ${endDate}`],
          ["Zonas en tabla", tableFiltered.length],
          ["Incluye histórico", includeHistory ? "Sí" : "No"],
          ["Histórico dividido", splitHistoryBySheet ? "Sí (por zona)" : "No (consolidado)"],
          ["Filas históricas estimadas en rango", estimatedHistoryCount],
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Resumen");
      }

      // --- Hoja 2: Promedios ---
      {
        const ws = XLSX.utils.json_to_sheet(tableFiltered);
        XLSX.utils.book_append_sheet(wb, ws, "Promedios");
      }

      // --- Histórico (opcional) ---
      if (includeHistory) {
        const pick = selectedZones.length > 0 ? new Set(selectedZones) : null;

        if (splitHistoryBySheet) {
          // Una hoja por zona (solo las que tengan registros en el rango)
          for (const row of tableFiltered) {
            const zoneName = row.Zona;
            if (pick && !pick.has(zoneName)) continue;
            const arr = historyData[zoneName] || historyData[(row as any).__zoneCode] || [];
            const list = Array.isArray(arr) ? arr : [];

            const rows: any[] = [];
            for (const m of list) {
              const t = parseTs(m);
              if (Number.isNaN(t) || t < startMs || t > endMs) continue;
              rows.push({
                Zona: zoneName,
                Fecha: toLocal(t),
                "Temp (°C)": m.temperature,
                "Humedad (%)": (m as any).humedity ?? (m as any).humidity ?? (m as any).hum,
              });
            }

            if (rows.length) {
              const ws = XLSX.utils.json_to_sheet(rows);
              // nombre de hoja <= 31 chars
              XLSX.utils.book_append_sheet(wb, ws, slug(`Hist_${zoneName}`).slice(0, 31));
            }
          }
        } else {
          // Consolidado en una sola hoja
          const rows: any[] = [];
          // 1) primero intentamos usar el nombre Zona para mapear directo
          // 2) Si no existe esa key en historyData, intentamos con __zoneCode
          for (const row of tableFiltered) {
            const zoneName = row.Zona;
            const byName = historyData[zoneName];
            const byCode = (row as any).__zoneCode ? historyData[(row as any).__zoneCode] : undefined;
            const source = Array.isArray(byName) ? byName : Array.isArray(byCode) ? byCode : [];

            for (const m of source) {
              const t = parseTs(m);
              if (Number.isNaN(t) || t < startMs || t > endMs) continue;
              rows.push({
                Zona: zoneName,
                Fecha: toLocal(t),
                "Temp (°C)": m.temperature,
                "Humedad (%)": (m as any).humedity ?? (m as any).humidity ?? (m as any).hum,
              });
            }
          }

          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, "Historico");
        }
      }

      const finalName = (fileName?.trim() ? fileName : defaultName) + ".xlsx";
      XLSX.writeFile(wb, finalName);

      // Log final útil para auditoría
      const counts: Record<string, number> = {};
      for (const row of tableFiltered) {
        const zoneName = row.Zona;
        const byName = historyData[zoneName];
        const byCode = (row as any).__zoneCode ? historyData[(row as any).__zoneCode] : undefined;
        const source = Array.isArray(byName) ? byName : Array.isArray(byCode) ? byCode : [];
        let c = 0;
        for (const m of source) {
          const t = parseTs(m);
          if (!Number.isNaN(t) && t >= startMs && t <= endMs) c++;
        }
        counts[zoneName] = c;
      }

      setShowModal(false);
    } catch (err) {
      console.error("Error exportando Excel:", err);
      alert("Ocurrió un error exportando el archivo.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {/* Botón principal */}
      <button
        onClick={() => !disabled && setShowModal(true)}
        className={[
          "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium shadow-md transition-all duration-150 w-full sm:w-auto",
          disabled || isExporting
            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
            : "bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white",
        ].join(" ")}
        disabled={disabled || isExporting}
        title={disabled ? "Espere a que termine de cargar el rango" : "Exportar Excel"}
      >
        <ArrowDownTrayIcon className={["w-5 h-5", isExporting ? "animate-pulse" : ""].join(" ")} />
        {isExporting ? "Generando…" : "Exportar Excel"}
      </button>

      {/* Modal de configuración */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 relative">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              Configurar exportación
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Personaliza la información a incluir en el archivo Excel.
            </p>

            {/* Nombre del archivo */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Nombre del archivo
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(slug(e.target.value))}
                placeholder={defaultName}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
              <p className="text-[11px] text-gray-400 mt-1 break-all">
                Se guardará como: <span className="font-mono">{(fileName || defaultName)}.xlsx</span>
              </p>
            </div>

            {/* Rango de fechas (solo lectura informativo) */}
            <div className="mb-4 text-xs text-gray-500">
              Rango: <span className="font-medium">{startDate}</span> a{" "}
              <span className="font-medium">{endDate}</span>
            </div>

            {/* Zonas */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-600">
                  Zonas a incluir
                </label>
                <button
                  onClick={toggleAll}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  {allSelected ? "Quitar todas" : "Seleccionar visibles"}
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-2">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-[10px]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar zona…"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
              </div>

              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                {zonesForPick.map((z) => {
                  const checked =
                    selectedZones.length === 0 || selectedZones.includes(z);
                return (
                    <label
                      key={z}
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-red-600 transition"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedZones((prev) =>
                            prev.includes(z)
                              ? prev.filter((x) => x !== z)
                              : [...prev, z]
                          )
                        }
                        className="accent-red-600"
                      />
                      {z}
                    </label>
                  );
                })}
                {zonesForPick.length === 0 && (
                  <div className="text-xs text-gray-500">
                    No hay zonas que coincidan con “{search}”.
                  </div>
                )}
              </div>
            </div>

            {/* Histórico */}
            <div className="space-y-2 mb-5">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={includeHistory}
                  onChange={() => setIncludeHistory((v) => !v)}
                  className="accent-red-600"
                />
                Incluir hoja de histórico
              </label>

              <label
                className={[
                  "flex items-center gap-2 text-sm",
                  includeHistory ? "text-gray-700" : "text-gray-400",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  disabled={!includeHistory}
                  checked={splitHistoryBySheet}
                  onChange={() => setSplitHistoryBySheet((v) => !v)}
                  className="accent-red-600 disabled:opacity-40"
                />
                Dividir histórico por zona (una hoja por zona)
              </label>

              {includeHistory && (
                <div className="text-xs text-gray-500">
                  Filas históricas (estimadas en el rango):{" "}
                  <span className="font-semibold">{estimatedHistoryCount.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isExporting}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition text-sm font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md transition-all duration-150 disabled:opacity-60"
              >
                {isExporting ? "Generando…" : "Descargar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExportButton;
