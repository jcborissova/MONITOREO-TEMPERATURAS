/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import PageContainer from "../components/layout/PageContainer";
import ResponsiveTable from "../components/ui/ResponsiveTable";
import NotificationDetailModal from "../components/notifications/NotificationDetailModal";
import { useNotifications, useSensors, usePendingMap } from "../hooks/useNotifications";
import type { Notification } from "../utils/notifications";
import { ArrowPathIcon } from "@heroicons/react/24/solid";

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

const KindBadge: React.FC<{ kind: Notification["kind"] }> = ({ kind }) => {
  const map: Record<Notification["kind"], string> = {
    critical: "bg-red-50 text-red-700 border-red-200",
    warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-green-50 text-green-700 border-green-200",
    other: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full border capitalize ${map[kind]}`}>{kind}</span>;
};

const ReadBadge: React.FC<{ read: boolean }> = ({ read }) => (
  <span
    className={`px-2 py-0.5 text-xs rounded-full border ${
      read ? "bg-gray-50 text-gray-600 border-gray-200" : "bg-purple-50 text-purple-700 border-purple-200"
    }`}
  >
    {read ? "Leída" : "No leída"}
  </span>
);

const NotificationsPage: React.FC = () => {
  const { all, loading, markAll, markOne, reload } = useNotifications();
  const sensorsList = useSensors();
  const pendingMap = usePendingMap();

  const [search, setSearch] = useState("");
  const [sensor, setSensor] = useState("");
  const [kind, setKind] = useState<"all" | Notification["kind"]>("all");
  const [read, setRead] = useState<"all" | "read" | "unread">("all");

  const data = useMemo(() => {
    let base = all;
    if (search.trim()) {
      const s = search.toLowerCase();
      base = base.filter(
        (n) =>
          (n.message || "").toLowerCase().includes(s) ||
          (n.sensor_uid || "").toLowerCase().includes(s)
      );
    }
    if (sensor) base = base.filter((n) => n.sensor_uid === sensor);
    if (kind !== "all") base = base.filter((n) => n.kind === kind);
    if (read === "read") base = base.filter((n) => n.is_read);
    if (read === "unread") base = base.filter((n) => !n.is_read);
    return [...base].sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
    );
  }, [all, search, sensor, kind, read]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null);

  const onActionClick = (action: string, row: Notification) => {
    if (action === "details") {
      setSelected(row);
      setDetailOpen(true);
    }
    if (action === "mark") void markOne(row.id);
    if (action === "filter_sensor") setSensor(row.sensor_uid || "");
  };

  return (
    <PageContainer
      title="Notificaciones"
      description="Consulta, filtra y gestiona las notificaciones del sistema."
      right={
        <div className="flex items-center gap-2">
          <button
            onClick={() => void reload()}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-1">
                <ArrowPathIcon className="w-4 h-4 animate-spin" /> Actualizando…
              </span>
            ) : (
              "Refrescar"
            )}
          </button>
          <button
            onClick={() => void markAll()}
            className="px-3 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            Marcar todas
          </button>
        </div>
      }
    >
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar texto o UID…"
          className="px-3 py-2 border rounded-lg"
        />
        <select
          value={sensor}
          onChange={(e) => setSensor(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">Todos los sensores</option>
          {sensorsList.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as any)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">Todos los tipos</option>
          <option value="critical">Crítico</option>
          <option value="warning">Advertencia</option>
          <option value="info">Info</option>
          <option value="success">Éxito</option>
          <option value="other">Otro</option>
        </select>
        <select
          value={read}
          onChange={(e) => setRead(e.target.value as any)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">Todas</option>
          <option value="unread">No leídas</option>
          <option value="read">Leídas</option>
        </select>
        <div className="text-sm text-gray-500 self-center">
          {data.length} resultado(s)
        </div>
      </div>

      <ResponsiveTable
        title="Listado de Notificaciones"
        data={data}
        emptyMessage={loading ? "Cargando…" : "No se encontraron notificaciones."}
        showExport
        onActionClick={onActionClick}
        actions={[
          { label: "Ver detalles", value: "details" },
          { label: "Marcar leída", value: "mark" },
          { label: "Filtrar por este sensor", value: "filter_sensor" },
        ]}
        columns={[
          {
            key: "message",
            label: "Mensaje",
            align: "left",
            render: (_v, row) => {
              const isPending = !!pendingMap[row.id];
              return (
                <div
                  className={`max-w-[420px] transition-opacity ${
                    isPending ? "opacity-60" : ""
                  }`}
                >
                  <div className="text-gray-900 font-medium line-clamp-2">
                    {row.message}
                  </div>
                  <div className="text-xs text-gray-500">
                    Sensor: {row.sensor_uid || "—"}
                  </div>
                </div>
              );
            },
          },
          {
            key: "kind",
            label: "Tipo",
            align: "left",
            render: (_v, row) => <KindBadge kind={row.kind} />,
          },
          {
            key: "value",
            label: "Valor",
            align: "right",
            render: (v) => v ?? "—",
          },
          {
            key: "thresholds",
            label: "Umbral (min / max)",
            align: "right",
            render: (_v, row) => (
              <span>
                {row.threshold_min ?? "—"} / {row.threshold_max ?? "—"}
              </span>
            ),
          },
          {
            key: "is_read",
            label: "Estado",
            align: "left",
            render: (_v, row) => <ReadBadge read={!!row.is_read} />,
          },
          {
            key: "created_at",
            label: "Fecha",
            align: "left",
            render: (_v, row) => (
              <div className="whitespace-nowrap">
                <div className="text-gray-900">{fmtDate(row.created_at)}</div>
                <div className="text-xs text-gray-500">{row.timeago}</div>
              </div>
            ),
          },
        ]}
      />

      <NotificationDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        data={selected}
        onMarkRead={async (id) => {
          await markOne(id); // actualiza store (optimista)
          setSelected((prev) =>
            prev && prev.id === id ? { ...prev, is_read: true } : prev
          );
        }}
        onFilterBySensor={(uid) => setSensor(uid)}
      />
    </PageContainer>
  );
};

export default NotificationsPage;
