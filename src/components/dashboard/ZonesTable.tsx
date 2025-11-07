/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
import type { Room } from "../../types/types";
import ResponsiveTable from "../ui/ResponsiveTable";

/* =========================
   Helpers
========================= */
const toMs = (v: any): number => {
  if (!v) return 0;
  const d =
    typeof v === "number"
      ? new Date(v < 9_999_999_999 ? v * 1000 : v)
      : typeof v === "string"
      ? new Date(v.includes(" ") ? v.replace(" ", "T") : v)
      : new Date(v);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const formatNumber = (value: number | null | undefined, suffix = "") => {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(2)}${suffix}`;
};

const formatAbsDate = (ms: number) =>
  ms ? new Date(ms).toLocaleString("es-DO") : "—";

const isConnectedWithin = (updatedMs: number, minutes = 5) =>
  !!updatedMs && Date.now() - updatedMs <= minutes * 60 * 1000;

const formatRelative = (ms: number): string => {
  if (!ms) return "Nunca";
  const diff = Date.now() - ms;
  if (diff < 0) return "en el futuro";
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 45) return "hace unos segundos";
  if (min < 2) return "hace 1 min";
  if (min < 60) return `hace ${min} min`;
  if (hr < 2) return "hace 1 h";
  if (hr < 24) return `hace ${hr} h`;
  if (day < 2) return "ayer";
  return `hace ${day} días`;
};

/* =========================
   Component
========================= */
interface ZonesTableProps {
  rooms: Room[];
  /** minutos para considerar “conectado” (default 5) */
  freshnessMinutes?: number;
}

const ZonesTable: React.FC<ZonesTableProps> = ({ rooms, freshnessMinutes = 5 }) => {
  // Enriquecemos filas con campos calculados
  const rows = useMemo(() => {
    return (rooms ?? []).map((r, idx) => {
      const displayName = (r as any).deviceName || r.name || `Zona ${r.id ?? idx + 1}`;
      const uid = (r as any).devEUI ?? (r as any).deviceName ?? null;

      const updatedMs = toMs(
        (r as any).updatedAt ??
          (r as any).lastSeen ??
          (r as any).timestamp ??
          (r as any).last_update
      );

      const connected = isConnectedWithin(updatedMs, freshnessMinutes);

      const temperature =
        r.temperature ?? (r as any)?.data?.temperature ?? null;
      const humedity =
        (r as any).humedity ??
        (r as any).humidity ??
        (r as any)?.data?.humidity ??
        null;
      const productivity = (r as any).productivity ?? null;

      const battery =
        (r as any).battery ?? (r as any).lastPower ?? null;

      return {
        ...r,
        _displayName: displayName,
        _uid: uid,
        _updatedMs: updatedMs,
        _lastSeenAbs: updatedMs ? formatAbsDate(updatedMs) : "—",
        _lastSeenRel: formatRelative(updatedMs),
        _connected: connected,
        _battery: battery,
        temperature: Number.isFinite(Number(temperature)) ? Number(temperature) : null,
        humedity: Number.isFinite(Number(humedity)) ? Number(humedity) : null,
        productivity: Number.isFinite(Number(productivity)) ? Number(productivity) : null,
      };
    });
  }, [rooms, freshnessMinutes]);

  const columns = useMemo(
    () => [
      {
        key: "_displayName",
        label: "Zona",
        align: "left" as const,
        render: (_: any, row: any) => (
          <div className="max-w-[260px]">
            <div className="font-semibold text-gray-900">{row._displayName}</div>
            <div className="text-xs text-gray-500">
              {row._uid ? `UID: ${row._uid}` : "UID no disponible"}
            </div>
          </div>
        ),
      },
      {
        key: "_connected",
        label: "Conexión",
        align: "left" as const,
        render: (_: any, row: any) => (
          <div className="flex flex-col">
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                row._connected ? "text-green-600" : "text-red-500"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  row._connected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {row._connected ? "Conectado" : "Desconectado"}
            </span>
            <span className="text-xs text-gray-500">
              {row._connected ? "Últ. actualización: " : "Últ. conexión: "}
              <b className="text-gray-700">{row._lastSeenRel}</b>
              {" • "}
              <span className="text-gray-500">{row._lastSeenAbs}</span>
            </span>
          </div>
        ),
      },
      {
        key: "temperature",
        label: "Temperatura (°C)",
        align: "center" as const,
        render: (v: number, row: any) => {
          if (!row._connected) return <span className="text-gray-400">—</span>;
          const cls =
            v > 35 ? "text-red-600" : v < 0 ? "text-blue-600" : "text-gray-800";
          return <span className={`font-medium ${cls}`}>{formatNumber(v, " °C")}</span>;
        },
      },
      {
        key: "humedity",
        label: "Humedad (%RH)",
        align: "center" as const,
        render: (v: number, row: any) =>
          row._connected ? (
            <span className="text-gray-800">{formatNumber(v, " %")}</span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      {
        key: "productivity",
        label: "Productividad",
        align: "center" as const,
        render: (v: number, row: any) => {
          if (!row._connected) return <span className="text-gray-400">—</span>;
          const cls =
            v >= 90 ? "text-green-600" : v >= 70 ? "text-yellow-600" : "text-red-600";
          return <span className={`font-semibold ${cls}`}>{formatNumber(v, " %")}</span>;
        },
      },
      {
        key: "_battery",
        label: "Batería",
        align: "center" as const,
        render: (v: number | null, row: any) => {
          if (v == null || Number.isNaN(Number(v))) {
            // Si no hay lectura de batería, marcamos OFF si está desconectado
            return row._connected ? (
              <span className="text-gray-400">—</span>
            ) : (
              <span className="text-red-500 font-medium">OFF</span>
            );
          }
          const pct = Math.round(Number(v));
          const tone =
            pct >= 80 ? "text-green-600" : pct >= 40 ? "text-yellow-600" : "text-red-600";
          // Si está desconectado, añadimos etiqueta OFF
          return row._connected ? (
            <span className={`font-semibold ${tone}`}>{pct}%</span>
          ) : (
            <span className={`font-semibold ${tone}`}>
              {pct}% · <span className="text-red-600">OFF</span>
            </span>
          );
        },
      },
      {
        key: "estado",
        label: "Estado",
        align: "center" as const,
        render: (_: any, row: any) => (
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs sm:text-sm font-semibold ${
              row.alert
                ? "bg-red-100 text-red-700"
                : row.warning
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {row.alert ? "Crítico" : row.warning ? "Advertencia" : "Normal"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="w-full">
      <ResponsiveTable
        data={rows}
        columns={columns}
        title="Resumen de Zonas"
        emptyMessage="No hay datos disponibles en este momento."
        defaultRowsPerPage={8}
        className="mt-4"
        showExport
      />
    </div>
  );
};

export default ZonesTable;
