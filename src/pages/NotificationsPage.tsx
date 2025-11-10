/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useDeferredValue,
  useCallback,
  memo,
} from "react";
import PageContainer from "../components/layout/PageContainer";
import ResponsiveTable from "../components/ui/ResponsiveTable";
import NotificationDetailModal from "../components/notifications/NotificationDetailModal";
import { useNotifications, useSensors, usePendingMap } from "../hooks/useNotifications";
import type { Notification } from "../utils/notifications";
import { ArrowPathIcon, BellAlertIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { FunnelIcon } from "@heroicons/react/24/solid";

/* =========================
   Utils & badges
========================= */

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

const KindBadge: React.FC<{ kind: Notification["kind"] }> = memo(({ kind }) => {
  const map: Record<Notification["kind"], string> = {
    critical: "bg-red-50 text-red-700 border-red-200",
    warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-green-50 text-green-700 border-green-200",
    other: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border capitalize ${map[kind]}`}>
      {kind}
    </span>
  );
});
KindBadge.displayName = "KindBadge";

const ReadBadge: React.FC<{ read: boolean }> = memo(({ read }) => (
  <span
    className={`px-2 py-0.5 text-xs rounded-full border ${
      read ? "bg-gray-50 text-gray-600 border-gray-200" : "bg-purple-50 text-purple-700 border-purple-200"
    }`}
  >
    {read ? "Leída" : "No leída"}
  </span>
));
ReadBadge.displayName = "ReadBadge";

/** Hasta 1024px consideramos layout compacto (cards) */
const useCompact = () => {
  const get = () =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1024px)").matches : true;
  const [match, setMatch] = React.useState<boolean>(get);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1024px)");
    const on = () => setMatch(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return match;
};

/* =========================
   Ayudas de filtros
========================= */
const hasActiveFilters = ({
  search,
  sensor,
  kind,
  read,
}: {
  search: string;
  sensor: string;
  kind: "all" | Notification["kind"];
  read: "all" | "read" | "unread";
}) => {
  return (
    (search && search.trim().length > 0) ||
    !!sensor ||
    kind !== "all" ||
    read !== "all"
  );
};

/* =========================
   Buttons, Skeletons, Empty
========================= */

const Button = ({
  children,
  onClick,
  disabled,
  className = "",
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={[
      "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition",
      disabled
        ? "text-gray-400 border-gray-200 bg-gray-50 cursor-wait"
        : "text-gray-700 border-gray-300 bg-white hover:bg-gray-50",
      className,
    ].join(" ")}
  >
    {children}
  </button>
);

const SkeletonCard = () => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm animate-pulse">
    <div className="h-4 w-32 bg-gray-200 rounded" />
    <div className="mt-2 h-5 w-4/5 bg-gray-200 rounded" />
    <div className="mt-3 grid grid-cols-2 gap-2 md:gap-3">
      <div className="h-10 bg-gray-100 rounded" />
      <div className="h-10 bg-gray-100 rounded" />
      <div className="h-10 bg-gray-100 rounded" />
      <div className="h-10 bg-gray-100 rounded" />
    </div>
  </div>
);

const SkeletonTable = () => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
    <div className="h-4 w-56 bg-gray-200 rounded mb-3" />
    <div className="w-full h-10 bg-gray-100 rounded mb-2" />
    {[...Array(6)].map((_, i) => (
      <div key={i} className="w-full h-9 bg-gray-100 rounded mb-2" />
    ))}
  </div>
);

/** EmptyState mejorado */
const EmptyState = ({
  onRetry,
  onClearAll,
  onShowAll,
  showClear,
}: {
  onRetry: () => void;
  onClearAll: () => void;
  onShowAll: () => void;
  showClear: boolean;
}) => (
  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 text-center">
    <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-5 ring-1 ring-blue-100">
      <BellAlertIcon className="w-9 h-9 text-blue-600" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900">Sin notificaciones por ahora</h3>
    <p className="text-sm text-gray-500 mt-1">
      No encontramos resultados con los filtros actuales. Puedes ajustar los filtros, mostrar todas o recargar.
    </p>

    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
      <Button onClick={onRetry}>
        <ArrowPathIcon className="w-4 h-4" />
        Refrescar
      </Button>
      <Button onClick={onShowAll}>
        <FunnelIcon className="w-4 h-4" />
        Ver todas
      </Button>
      {showClear && (
        <Button onClick={onClearAll} className="!text-gray-700 !bg-gray-50 hover:!bg-gray-100">
          <XMarkIcon className="w-4 h-4" />
          Limpiar filtros
        </Button>
      )}
    </div>

    <div className="mt-5 text-xs text-gray-400 space-y-1">
      <p>Tip: filtra por sensor, tipo o estado; también puedes limpiar la búsqueda.</p>
      <p>Las nuevas alertas aparecerán aquí automáticamente al actualizar.</p>
    </div>
  </div>
);

/* =========================
   Card memoizada (mobile/tablet)
========================= */
const NotificationCard = memo(function NotificationCard({
  row,
  isPending,
  onMark,
  onOpen,
  onFilterSensor,
}: {
  row: Notification;
  isPending: boolean;
  onMark: (id: number) => void;
  onOpen: (row: Notification) => void;
  onFilterSensor: (uid: string) => void;
}) {
  return (
    <article
      className={`rounded-xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm transition-opacity ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <KindBadge kind={row.kind} />
            {!!row.sensor_uid && (
              <button
                onClick={() => onFilterSensor(row.sensor_uid!)}
                className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                title={`Filtrar por sensor ${row.sensor_uid}`}
              >
                Sensor: {row.sensor_uid}
              </button>
            )}
            <span className="ml-auto text-[11px] text-gray-500">{row.timeago}</span>
          </div>

          <h3 className="mt-2 text-[15px] md:text-base font-semibold text-gray-900 line-clamp-3">
            {row.message}
          </h3>

          <div className="mt-3 md:mt-4 grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
            <div className="rounded-lg border bg-gray-50 px-2 py-1.5">
              <div className="text-gray-500">Valor</div>
              <div className="font-medium text-gray-900">{row.value ?? "—"}</div>
            </div>
            <div className="rounded-lg border bg-gray-50 px-2 py-1.5">
              <div className="text-gray-500">Umbral</div>
              <div className="font-medium text-gray-900">
                {row.threshold_min ?? "—"} / {row.threshold_max ?? "—"}
              </div>
            </div>
            <div className="rounded-lg border bg-gray-50 px-2 py-1.5">
              <div className="text-gray-500">Estado</div>
              <div className="font-medium">
                <ReadBadge read={!!row.is_read} />
              </div>
            </div>
            <div className="rounded-lg border bg-gray-50 px-2 py-1.5">
              <div className="text-gray-500">Fecha</div>
              <div className="font-medium text-gray-900">{fmtDate(row.created_at)}</div>
            </div>
          </div>

          <div className="mt-3 md:mt-4 flex flex-col sm:flex-row gap-2">
            {!row.is_read && (
              <button
                onClick={() => onMark(row.id)}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Marcar leída
              </button>
            )}
            <button
              onClick={() => onOpen(row)}
              className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
            >
              Ver detalles
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});

/* =========================
   Página
========================= */

const PAGE_SIZE = 60; // cantidad por "página" en render incremental

const NotificationsPage: React.FC = () => {
  const { all, loading, markAll, markOne, reload } = useNotifications();
  const sensorsList = useSensors();
  const pendingMap = usePendingMap();
  const isCompact = useCompact();

  // Filtros
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sensor, setSensor] = useState("");
  const [kind, setKind] = useState<"all" | Notification["kind"]>("all");
  const [read, setRead] = useState<"all" | "read" | "unread">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Datos filtrados
  const filtered = useMemo(() => {
    let base = all;
    const s = deferredSearch.trim().toLowerCase();
    if (s) {
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
    return [...base].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [all, deferredSearch, sensor, kind, read]);

  // Render incremental
  const [page, setPage] = useState(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reinicia paginación cuando cambian filtros o tamaño de base
  useEffect(() => setPage(1), [deferredSearch, sensor, kind, read, all.length]);

  // Anti-spam de reloads
  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  const isReloadingRef = useRef(false);
  const handleReload = useCallback(async () => {
    if (isReloadingRef.current) return;
    isReloadingRef.current = true;
    try {
      await Promise.resolve(reloadRef.current?.());
    } finally {
      isReloadingRef.current = false;
    }
  }, []);

  // IO para “infinite scroll” (no crecer si ya mostramos todo o si está cargando)
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first.isIntersecting) return;
        if (loading) return;
        const maxPages = Math.ceil(filtered.length / PAGE_SIZE);
        setPage((p) => (p >= maxPages ? p : p + 1));
      },
      { rootMargin: "512px 0px 0px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length, loading]);

  const visible = useMemo(
    () => filtered.slice(0, page * PAGE_SIZE),
    [filtered, page]
  );

  // Modal de detalle
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null);

  const handleMarkOne = useCallback((id: number) => { void markOne(id); }, [markOne]);
  const handleOpen = useCallback((row: Notification) => {
    setSelected(row);
    setDetailOpen(true);
  }, []);
  const handleFilterSensor = useCallback((uid: string) => setSensor(uid), []);
  const handleMarkAll = useCallback(() => void markAll(), [markAll]);

  // Acciones del header
  const TopActions = (
    <div className="flex items-center gap-2 relative">
      {loading && <div className="absolute inset-0 rounded-lg bg-white/50 backdrop-blur-[1px]" />}
      <Button onClick={handleReload} disabled={loading}>
        <ArrowPathIcon className={["w-4 h-4", loading ? "animate-spin" : ""].join(" ")} />
        {loading ? "Actualizando…" : "Refrescar"}
      </Button>
      <Button
        onClick={handleMarkAll}
        disabled={loading || visible.length === 0}
        className="!bg-blue-600 !text-white hover:!bg-blue-700 border-blue-600"
      >
        Marcar todas
      </Button>
    </div>
  );

  /** Helpers para reset */
  const clearAllFilters = useCallback(() => {
    setSearch("");
    setSensor("");
    setKind("all");
    setRead("all");
  }, []);
  const showAll = useCallback(() => {
    setSensor("");
    setKind("all");
    setRead("all");
    setSearch("");
  }, []);

  const filtersActive = hasActiveFilters({ search, sensor, kind, read });

  return (
    <PageContainer
      title="Notificaciones"
      description="Consulta, filtra y gestiona las notificaciones del sistema."
      right={!isCompact ? TopActions : undefined}
    >
      {/* Barra de filtros */}
      {isCompact ? (
        <div className="mb-3 flex items-center gap-2">
          <Button onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
            <FunnelIcon className="w-4 h-4" />
            Filtros
          </Button>
          {TopActions}
        </div>
      ) : null}

      {/* Contenido filtros */}
      {isCompact ? (
        filtersOpen && (
          <div className="grid grid-cols-1 gap-2 mb-4 p-3 rounded-xl border bg-white">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar texto o UID…"
              className="px-3 py-2 border rounded-lg"
            />
            <select value={sensor} onChange={(e) => setSensor(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="">Todos los sensores</option>
              {sensorsList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="px-3 py-2 border rounded-lg">
              <option value="all">Todos los tipos</option>
              <option value="critical">Crítico</option>
              <option value="warning">Advertencia</option>
              <option value="info">Info</option>
              <option value="success">Éxito</option>
              <option value="other">Otro</option>
            </select>
            <select value={read} onChange={(e) => setRead(e.target.value as any)} className="px-3 py-2 border rounded-lg">
              <option value="all">Todas</option>
              <option value="unread">No leídas</option>
              <option value="read">Leídas</option>
            </select>
            <div className="text-sm text-gray-500">
              Mostrando {visible.length} de {filtered.length} resultado(s)
            </div>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar texto o UID…"
            className="px-3 py-2 border rounded-lg"
          />
          <select value={sensor} onChange={(e) => setSensor(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="">Todos los sensores</option>
            {sensorsList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="px-3 py-2 border rounded-lg">
            <option value="all">Todos los tipos</option>
            <option value="critical">Crítico</option>
            <option value="warning">Advertencia</option>
            <option value="info">Info</option>
            <option value="success">Éxito</option>
            <option value="other">Otro</option>
          </select>
          <select value={read} onChange={(e) => setRead(e.target.value as any)} className="px-3 py-2 border rounded-lg">
            <option value="all">Todas</option>
            <option value="unread">No leídas</option>
            <option value="read">Leídas</option>
          </select>
          <div className="text-sm text-gray-500 self-center">
            Mostrando {visible.length} de {filtered.length} resultado(s)
          </div>
        </div>
      )}

      {/* Lista: tarjetas en compacto, tabla en desktop */}
      {isCompact ? (
        <div className="space-y-3">
          {loading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {!loading && visible.length === 0 && (
            <EmptyState
              onRetry={handleReload}
              onClearAll={clearAllFilters}
              onShowAll={showAll}
              showClear={filtersActive}
            />
          )}

          {visible.map((row) => {
            const isPending = !!pendingMap[row.id];
            return (
              <NotificationCard
                key={row.id}
                row={row}
                isPending={isPending}
                onMark={handleMarkOne}
                onOpen={handleOpen}
                onFilterSensor={handleFilterSensor}
              />
            );
          })}

          {/* Sentinel para “infinite scroll” */}
          <div ref={sentinelRef} className="h-6" />
        </div>
      ) : (
        <div className="min-w-0 max-w-full overflow-x-auto">
          {loading ? (
            <SkeletonTable />
          ) : visible.length === 0 ? (
            <EmptyState
              onRetry={handleReload}
              onClearAll={clearAllFilters}
              onShowAll={showAll}
              showClear={filtersActive}
            />
          ) : (
            <ResponsiveTable
              title="Listado de Notificaciones"
              data={visible} // solo lo visible
              showExport
              onActionClick={(action, row) => {
                if (action === "details") handleOpen(row as Notification);
                if (action === "mark") handleMarkOne((row as Notification).id);
                if (action === "filter_sensor") handleFilterSensor((row as Notification).sensor_uid || "");
              }}
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
                  render: (_v, row: Notification) => {
                    const isPending = !!pendingMap[row.id];
                    return (
                      <div className={`max-w-[520px] transition-opacity ${isPending ? "opacity-60" : ""}`}>
                        <div className="text-gray-900 font-medium line-clamp-2">{row.message}</div>
                        <div className="text-xs text-gray-500">Sensor: {row.sensor_uid || "—"}</div>
                      </div>
                    );
                  },
                },
                { key: "kind", label: "Tipo", align: "left", render: (_v, row: Notification) => <KindBadge kind={row.kind} /> },
                { key: "value", label: "Valor", align: "right", render: (v) => v ?? "—" },
                {
                  key: "thresholds",
                  label: "Umbral (min / max)",
                  align: "right",
                  render: (_v, row: Notification) => (
                    <span>
                      {row.threshold_min ?? "—"} / {row.threshold_max ?? "—"}
                    </span>
                  ),
                },
                { key: "is_read", label: "Estado", align: "left", render: (_v, row: Notification) => <ReadBadge read={!!row.is_read} /> },
                {
                  key: "created_at",
                  label: "Fecha",
                  align: "left",
                  render: (_v, row: Notification) => (
                    <div className="whitespace-nowrap">
                      <div className="text-gray-900">{fmtDate(row.created_at)}</div>
                      <div className="text-xs text-gray-500">{row.timeago}</div>
                    </div>
                  ),
                },
              ]}
            />
          )}
          {/* Sentinel también para desktop */}
          <div ref={sentinelRef} className="h-6" />
        </div>
      )}

      {/* Modal detalle */}
      <NotificationDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        data={selected}
        onMarkRead={async (id) => {
          await markOne(id);
          setSelected((prev) => (prev && prev.id === id ? { ...prev, is_read: true } : prev));
        }}
        onFilterBySensor={handleFilterSensor}
      />

      {/* Aviso flotante cuando loading */}
      {loading && (
        <div className="fixed bottom-4 right-4 px-3 py-2 rounded-lg bg-white/90 border border-gray-200 shadow-md flex items-center gap-2 backdrop-blur">
          <ArrowPathIcon className="w-4 h-4 animate-spin text-gray-600" />
          <span className="text-sm text-gray-700">Actualizando notificaciones…</span>
        </div>
      )}
    </PageContainer>
  );
};

export default NotificationsPage;
