/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React from "react";
import ResponsiveTable from "../ui/ResponsiveTable";

export type ReportRow = {
  Zona: string;
  "Promedio Temperatura (°C)": string | number;
  "Promedio Humedad (%)": string | number;
  "Temp Mín (°C)": string | number;
  "Temp Máx (°C)": string | number;
  "Total Registros": number;
  __history?: any[];
  __zoneCode?: string;
};

type CellRenderer = (value: any, row: ReportRow) => React.ReactNode;
type CustomRenderers = Partial<Record<keyof ReportRow, CellRenderer>>;

interface ReportTableProps {
  data: ReportRow[];
  customRenderers?: CustomRenderers;
  loading?: boolean;
  /** Si NO quieres expandible (subinformación), pásalo en false */
  expandable?: boolean;
}

/* Helpers */
const fmtNum = (v: any, digits = 2) =>
  v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(digits);

const parseToDate = (rec: any): string => {
  const ts = rec?.timestamp ?? rec?.created_at ?? rec?.time ?? rec?.date ?? rec?.updatedAt;
  if (ts == null) return "—";
  let ms = NaN;
  if (typeof ts === "number") ms = ts < 9_999_999_999 ? ts * 1000 : ts;
  else if (typeof ts === "string") ms = Date.parse(ts.includes(" ") ? ts.replace(" ", "T") : ts);
  else ms = new Date(ts).getTime();
  if (Number.isNaN(ms)) return "—";
  return new Date(ms).toLocaleString("es-DO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ReportTable: React.FC<ReportTableProps> = ({
  data,
  customRenderers,
  loading,
  expandable = true,
}) => {
  const expandedRender =
    !expandable
      ? undefined
      : (row: ReportRow) => {
          const history = Array.isArray(row.__history) ? row.__history : [];
          if (!history.length)
            return (
              <div className="text-gray-500 text-sm">
                No hay histórico disponible para esta zona.
              </div>
            );

          return (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">
                Histórico de {row.Zona}
                <span className="text-xs text-gray-400 ml-2">
                  ({history.length.toLocaleString()} registros)
                </span>
              </h4>

              <div className="overflow-y-auto max-h-72 rounded-lg border border-gray-100">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-3 text-left">Fecha</th>
                      <th className="py-2 px-3 text-right">Temp (°C)</th>
                      <th className="py-2 px-3 text-right">Humedad (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-700">{parseToDate(m)}</td>
                        <td className="py-2 px-3 text-right text-blue-700">
                          {fmtNum(m.temperature, 2)}
                        </td>
                        <td className="py-2 px-3 text-right text-green-700">
                          {fmtNum((m as any).humedity ?? (m as any).humidity ?? (m as any).hum, 1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        };

  return (
    <ResponsiveTable
      title="Promedios por Zona"
      data={data}
      expandableKey={expandable ? "Zona" : undefined}
      expandedRender={expandedRender}
      emptyMessage="No hay datos disponibles para el rango seleccionado."
      showExport={false}
      loading={loading}
      loadingMessage="Cargando tabla…"
      skeletonRows={8}
      headerProps={{
        className: "",
      }}
      columns={[
        {
          key: "Zona",
          label: "Zona",
          render: ((v: any, row: ReportRow) =>
            customRenderers?.Zona ? (
              customRenderers.Zona(v, row)
            ) : (
              <div className="leading-tight">
                <div className="font-medium text-gray-900">{v}</div>
                {row.__zoneCode && (
                  <div className="text-[11px] text-gray-500">{row.__zoneCode}</div>
                )}
              </div>
            )) as any,
        },
        {
          key: "Promedio Temperatura (°C)",
          label: "Prom. Temp (°C)",
          align: "right",
          render: (v: any) => <span className="text-blue-700">{v}</span>,
        },
        {
          key: "Promedio Humedad (%)",
          label: "Prom. Humedad (%)",
          align: "right",
          render: (v: any) => <span className="text-green-700">{v}</span>,
        },
        { key: "Temp Mín (°C)", label: "Mín Temp", align: "right" },
        { key: "Temp Máx (°C)", label: "Máx Temp", align: "right" },
        {
          key: "Total Registros",
          label: "Registros",
          align: "center",
          render: (v: any) => <span className="font-medium text-gray-600">{v}</span>,
        },
      ]}
    />
  );
};

export default ReportTable;
