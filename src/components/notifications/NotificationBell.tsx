/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState, useEffect } from "react";
import { BellIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationDetailModal from "./NotificationDetailModal";
import { useNotifications, usePendingMap } from "../../hooks/useNotifications";
import type { Notification } from "../../utils/notifications";

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { all, loading, unreadCount, markAll, markOne, reload } = useNotifications({ pollMs: 20000 });
  const pendingMap = usePendingMap();

  const lastFive = useMemo(
    () => [...all].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 5),
    [all]
  );

  const [openPopover, setOpenPopover] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null);
  const [pendingAll, setPendingAll] = useState(false);

  const openItem = (n: Notification) => {
    setOpenPopover(false);
    setSelected(n);
    setOpenDetail(true);
  };

  // cerrar al navegar/esc/visibilidad
  useEffect(() => {
    setOpenPopover(false);
    setOpenDetail(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setOpenPopover(false), setOpenDetail(false));
    const onVis = () => { if (document.visibilityState !== "visible") { setOpenPopover(false); setOpenDetail(false); } };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const handleMarkAll = async () => {
    setPendingAll(true);
    try { await markAll(); } finally { setPendingAll(false); }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpenPopover((v) => !v)}
        className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none transition"
        aria-label="Notificaciones"
      >
        <BellIcon className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-semibold rounded-full px-1.5 shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {openPopover && <div className="fixed inset-0 z-40" onClick={() => setOpenPopover(false)} />}

      {openPopover && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <div className="text-sm font-semibold text-gray-800">Notificaciones</div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAll}
                disabled={pendingAll || loading}
                className={`text-xs ${pendingAll ? "text-gray-400 cursor-wait" : "text-blue-600 hover:underline"}`}
              >
                {pendingAll ? (
                  <span className="inline-flex items-center gap-1">
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                    Marcando…
                  </span>
                ) : ("Marcar todas")}
              </button>
              <button
                onClick={() => { setOpenPopover(false); navigate("/notifications"); }}
                className="text-xs text-gray-600 hover:underline"
              >
                Ver todas
              </button>
            </div>
          </div>

          {/* Lista */}
          <ul className={`max-h-[380px] overflow-y-auto divide-y divide-gray-100`}>
            {loading && (
              <li className="p-6 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
                <ArrowPathIcon className="w-4 h-4 animate-spin" /> Cargando…
              </li>
            )}

            {!loading && lastFive.length === 0 && (
              <li className="p-6 text-center text-gray-500 text-sm">
                No hay notificaciones nuevas.
              </li>
            )}

            {!loading && lastFive.map((n) => {
              const isPending = !!pendingMap[n.id];
              return (
                <li key={n.id} className={`p-4 flex items-start gap-3 hover:bg-gray-50 transition ${isPending ? "opacity-60" : ""}`}>
                  <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                    n.kind === "critical" ? "bg-red-500" :
                    n.kind === "warning" ? "bg-yellow-400" :
                    n.kind === "success" ? "bg-green-500" : "bg-blue-500"
                  }`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 line-clamp-2">{n.message}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {n.sensor_uid ? `Sensor: ${n.sensor_uid} • ` : ""}{n.timeago}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      {!n.is_read && (
                        <button
                          onClick={() => void markOne(n.id)}
                          disabled={isPending}
                          className={`text-xs ${isPending ? "text-gray-400 cursor-wait" : "text-blue-600 hover:underline"}`}
                        >
                          Marcar leída
                        </button>
                      )}
                      <button onClick={() => openItem(n)} className="text-xs text-gray-600 hover:underline">
                        Ver detalle
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">
            <span>
              Total: <strong>{all.length}</strong> • Sin leer:{" "}
              <strong className="text-blue-600">{unreadCount}</strong>
            </span>
            <button
              onClick={() => void reload()}
              className="flex items-center gap-1 text-gray-600 hover:text-blue-600"
              disabled={loading}
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Actualizando…" : "Refrescar"}
            </button>
          </div>
        </div>
      )}

      <NotificationDetailModal
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        data={selected}
        onMarkRead={async (id) => {
          await markOne(id);
          setSelected((prev) =>
            prev && prev.id === id ? { ...prev, is_read: true } : prev
          );
        }}
        onFilterBySensor={(uid) => {
          if (!uid) return; // guard
          setOpenDetail(false);
          navigate(`/notifications?sensor=${encodeURIComponent(uid)}`);
        }}
      />
    </div>
  );
};

export default NotificationBell;
