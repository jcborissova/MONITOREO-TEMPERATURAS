/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useMemo,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import * as XLSX from "xlsx";
import {
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import type { ReportRow } from "../../pages/ReportPage";
import { WeatherContext } from "../../context/WeatherContext";
import BaseModal from "../ui/BaseModal";
import ModalHeader from "../ui/ModalHeader";
import ModalFooter from "../ui/ModalFooter";

/* ---------- helpers ---------- */
const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9_\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);

const parseTs = (rec: any): number => {
  const ts =
    rec?.timestamp ??
    rec?.created_at ??
    rec?.time ??
    rec?.date ??
    rec?.updatedAt ??
    null;

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
  new Date(ms).toLocaleString("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  });

/* =========================
   Props
========================= */
interface ExportButtonProps {
  data: ReportRow[];
  startDate: string;
  endDate: string;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  startDate,
  endDate,
  disabled = false,
}) => {
  const { historyData } = useContext(WeatherContext);

  const [showModal, setShowModal] = useState(false);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [splitHistoryBySheet, setSplitHistoryBySheet] = useState(false);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // nombre por defecto del archivo
  const defaultName = useMemo(() => {
    const base = `Reporte_Zonas_${startDate}_a_${endDate}_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}`;
    return slug(base);
  }, [startDate, endDate]);

  const [fileName, setFileName] = useState(defaultName);

  // cuando cambia el rango, refrescamos sugerencia
  useEffect(() => {
    setFileName(defaultName);
  }, [defaultName]);

  // rango en ms
  const startMs = useMemo(
    () => new Date(`${startDate}T00:00:00`).getTime(),
    [startDate]
  );
  const endMs = useMemo(
    () => new Date(`${endDate}T23:59:59.999`).getTime(),
    [endDate]
  );

  /* =========================
     Zonas
  ========================== */

  // lista única de zonas
  const allZones = useMemo(() => {
    const set = new Set<string>();
    data.forEach((d) => {
      if (d.Zona) set.add(d.Zona);
    });
    return Array.from(set);
  }, [data]);

  // cuando abro el modal, selecciono todas por defecto
  useEffect(() => {
    if (!showModal) return;
    setSelectedZones(allZones);
    setSearch("");
  }, [showModal, allZones]);

  // zonas filtradas por búsqueda
  const zonesForPick = useMemo(() => {
    const text = search.trim().toLowerCase();
    return text
      ? allZones.filter((z) => z.toLowerCase().includes(text))
      : allZones;
  }, [allZones, search]);

  const selectedSet = useMemo(
    () => new Set(selectedZones),
    [selectedZones]
  );

  // datos que realmente se exportan (Promedios)
  const tableFiltered = useMemo(() => {
    if (!selectedZones.length) return [];
    const pick = new Set(selectedZones);
    return data.filter((d) => pick.has(d.Zona));
  }, [data, selectedZones]);

  // ¿todas las visibles están seleccionadas?
  const allVisibleSelected = useMemo(() => {
    if (!zonesForPick.length) return false;
    return zonesForPick.every((z) => selectedSet.has(z));
  }, [zonesForPick, selectedSet]);

  const toggleZone = (z: string) => {
    setSelectedZones((prev) =>
      prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z]
    );
  };

  const toggleVisible = () => {
    if (!zonesForPick.length) return;

    setSelectedZones((prev) => {
      const prevSet = new Set(prev);
      if (zonesForPick.every((z) => prevSet.has(z))) {
        // quitar visibles
        return prev.filter((z) => !zonesForPick.includes(z));
      }
      // agregar visibles
      const merged = new Set(prev);
      zonesForPick.forEach((z) => merged.add(z));
      return Array.from(merged);
    });
  };

  /* =========================
     Histórico
  ========================== */

  const buildHistoryRowsForZone = useCallback(
    (row: ReportRow) => {
      const zoneName = row.Zona;
      const byName = historyData[zoneName];
      const byCode = (row as any).__zoneCode
        ? historyData[(row as any).__zoneCode]
        : undefined;
      const source = Array.isArray(byName)
        ? byName
        : Array.isArray(byCode)
        ? byCode
        : [];

      const rows: any[] = [];
      for (const m of source) {
        const t = parseTs(m);
        if (Number.isNaN(t) || t < startMs || t > endMs) continue;
        rows.push({
          Zona: zoneName,
          Fecha: toLocal(t),
          "Temp (°C)": m.temperature,
          "Humedad (%)":
            (m as any).humedity ??
            (m as any).humidity ??
            (m as any).hum,
        });
      }
      return rows;
    },
    [historyData, startMs, endMs]
  );

  const estimatedHistoryCount = useMemo(() => {
    if (!includeHistory || !tableFiltered.length) return 0;
    return tableFiltered.reduce(
      (acc, row) => acc + buildHistoryRowsForZone(row).length,
      0
    );
  }, [includeHistory, tableFiltered, buildHistoryRowsForZone]);

  /* =========================
     Exportar
  ========================== */

  const handleExport = async () => {
    try {
      if (disabled) return;
      if (!data.length) {
        alert("No hay datos para exportar.");
        return;
      }
      if (!selectedZones.length) {
        alert("Debes seleccionar al menos una zona.");
        return;
      }

      setIsExporting(true);
      const wb = XLSX.utils.book_new();

      // Resumen
      {
        const now = new Date();
        const rows = [
          ["Reporte de zonas", ""],
          ["Generado en", toLocal(now.getTime())],
          ["Rango", `${startDate} a ${endDate}`],
          ["Zonas seleccionadas", tableFiltered.length],
          ["Incluye histórico", includeHistory ? "Sí" : "No"],
          [
            "Histórico dividido",
            includeHistory
              ? splitHistoryBySheet
                ? "Sí (por zona)"
                : "No (consolidado)"
              : "N/A",
          ],
          ["Filas históricas estimadas en rango", estimatedHistoryCount],
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Resumen");
      }

      // Promedios
      {
        const ws = XLSX.utils.json_to_sheet(tableFiltered);
        XLSX.utils.book_append_sheet(wb, ws, "Promedios");
      }

      // Histórico
      if (includeHistory) {
        if (splitHistoryBySheet) {
          for (const row of tableFiltered) {
            const zoneRows = buildHistoryRowsForZone(row);
            if (!zoneRows.length) continue;
            const ws = XLSX.utils.json_to_sheet(zoneRows);
            XLSX.utils.book_append_sheet(
              wb,
              ws,
              slug(`Hist_${row.Zona}`).slice(0, 31)
            );
          }
        } else {
          const rows: any[] = [];
          for (const row of tableFiltered) {
            rows.push(...buildHistoryRowsForZone(row));
          }
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, "Historico");
        }
      }

      const finalName =
        (fileName?.trim() ? fileName : defaultName) + ".xlsx";
      XLSX.writeFile(wb, finalName);

      setShowModal(false);
    } catch (err) {
      console.error("Error exportando Excel:", err);
      alert("Ocurrió un error exportando el archivo.");
    } finally {
      setIsExporting(false);
    }
  };

  /* =========================
     Render
  ========================== */

  return (
    <>
      <button
        onClick={() => !disabled && setShowModal(true)}
        className={[
          "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium shadow-md",
          "transition-all duration-150 w-full sm:w-auto",
          disabled || isExporting
            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
            : "bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white",
        ].join(" ")}
        disabled={disabled || isExporting}
        title={
          disabled
            ? "Espere a que termine de cargar el rango"
            : "Exportar Excel"
        }
      >
        <ArrowDownTrayIcon
          className={[
            "w-5 h-5",
            isExporting ? "animate-pulse" : "",
          ].join(" ")}
        />
        {isExporting ? "Generando…" : "Exportar Excel"}
      </button>

      {showModal && (
        <BaseModal
          isOpen={showModal}
          onClose={() => (!isExporting ? setShowModal(false) : undefined)}
        >
          <ModalHeader
            title="Configurar exportación"
            onClose={() => (!isExporting ? setShowModal(false) : undefined)}
          />

          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Personaliza la información a incluir en el archivo Excel.
            </p>

            {/* Nombre archivo */}
            <div>
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
                Se guardará como:{" "}
                <span className="font-mono">
                  {(fileName || defaultName) + ".xlsx"}
                </span>
              </p>
            </div>

            {/* Rango info */}
            <div className="text-xs text-gray-500">
              Rango:{" "}
              <span className="font-medium">{startDate}</span> a{" "}
              <span className="font-medium">{endDate}</span>
            </div>

            {/* Zonas */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-600">
                  Zonas a incluir
                </label>
                <button
                  onClick={toggleVisible}
                  type="button"
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  {allVisibleSelected
                    ? "Quitar visibles"
                    : "Seleccionar visibles"}
                </button>
              </div>

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
                {zonesForPick.map((z) => (
                  <label
                    key={z}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-red-600 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSet.has(z)}
                      onChange={() => toggleZone(z)}
                      className="accent-red-600"
                    />
                    {z}
                  </label>
                ))}

                {zonesForPick.length === 0 && (
                  <div className="text-xs text-gray-500">
                    No hay zonas que coincidan con “{search}”.
                  </div>
                )}
              </div>

              <p className="mt-1 text-[11px] text-gray-400">
                Zonas seleccionadas:{" "}
                <span className="font-semibold">
                  {selectedZones.length}
                </span>
                {selectedZones.length === 0 &&
                  " — selecciona al menos una para poder exportar."}
              </p>
            </div>

            {/* Histórico */}
            <div className="space-y-2">
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
                  includeHistory
                    ? "text-gray-700"
                    : "text-gray-400",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  disabled={!includeHistory}
                  checked={splitHistoryBySheet}
                  onChange={() =>
                    setSplitHistoryBySheet((v) => !v)
                  }
                  className="accent-red-600 disabled:opacity-40"
                />
                Dividir histórico por zona (una hoja por zona)
              </label>

              {includeHistory && (
                <div className="text-xs text-gray-500">
                  Filas históricas (estimadas en el rango):{" "}
                  <span className="font-semibold">
                    {estimatedHistoryCount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <ModalFooter
            onCancel={() =>
              !isExporting && setShowModal(false)
            }
            onConfirm={handleExport}
            confirmLabel={isExporting ? "Generando…" : "Descargar"}
            confirmDisabled={
              isExporting || disabled || !data.length
            }
            cancelLabel="Cancelar"
            isLoading={isExporting}
          />
        </BaseModal>
      )}
    </>
  );
};

export default ExportButton;
