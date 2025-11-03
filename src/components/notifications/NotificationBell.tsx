/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  Fragment,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { BellIcon, ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationDetailModal from "./NotificationDetailModal";
import { useNotifications, usePendingMap } from "../../hooks/useNotifications";
import type { Notification } from "../../utils/notifications";

type Kind = "critical" | "warning" | "success" | "info" | string;

const KIND_STYLES: Record<Kind, { dot: string; chip: string }> = {
  critical: { dot: "bg-red-500", chip: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  warning:  { dot: "bg-yellow-400", chip: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200" },
  success:  { dot: "bg-green-500", chip: "bg-green-50 text-green-700 ring-1 ring-green-200" },
  info:     { dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
};

const useIsMobile = (query = "(max-width: 640px)") => {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [query]);
  return isMobile;
};

const useBodyScrollLock = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
};

// calcula posición del popover anclado al botón (con “flip” si pega bordes)
function computeDesktopPosition(
  btn: HTMLElement,
  popoverWidth = 384, // 24rem
  gap = 10
) {
  const rect = btn.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // preferimos alinear el borde derecho del popover con el del botón
  let left = rect.right - popoverWidth;
  // si se sale por la izquierda, pegamos a 8px
  if (left < 8) left = 8;
  // si se sale por la derecha, lo empujamos hacia la izquierda
  if (left + popoverWidth > vw - 8) left = Math.max(8, vw - popoverWidth - 8);

  // top por debajo del botón
  let top = rect.bottom + gap;

  // si no hay espacio debajo, lo mostramos encima (flip vertical)
  const estimatedHeight = Math.min(420 + 48 + 40, vh - 16); // lista + header + footer aprox
  if (top + estimatedHeight > vh - 8) {
    const flippedTop = rect.top - gap - estimatedHeight;
    if (flippedTop >= 8) {
      top = flippedTop;
    } else {
      // si tampoco cabe arriba, lo pegamos a 8px del borde
      top = Math.min(rect.bottom + gap, vh - estimatedHeight - 8);
    }
  }
  return { top, left, width: popoverWidth };
}

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const { all, loading, unreadCount, markAll, markOne, reload } = useNotifications({
    pollMs: 20000,
  });
  const pendingMap = usePendingMap();

  const lastFive = useMemo(
    () =>
      [...all]
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 5),
    [all]
  );

  const [openPanel, setOpenPanel] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null);
  const [pendingAll, setPendingAll] = useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Posición desktop del popover
  const [deskPos, setDeskPos] = useState<{ top: number; left: number; width: number } | null>(
    null
  );

  // Lock scroll en móvil cuando panel abierto
  useBodyScrollLock(isMobile && openPanel);

  const closePanel = useCallback(() => {
    setOpenPanel(false);
    setActiveIndex(-1);
    triggerRef.current?.focus();
  }, []);

  const openItem = (n: Notification) => {
    setSelected(n);
    setOpenDetail(true);
  };

  // Cerrar al navegar/ocultar
  useEffect(() => {
    setOpenPanel(false);
    setOpenDetail(false);
  }, [location.pathname, location.search, location.hash]);

  // Esc/visibility
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openDetail) setOpenDetail(false);
        else if (openPanel) closePanel();
      }
    };
    const onVis = () => {
      if (document.visibilityState !== "visible") {
        setOpenPanel(false);
        setOpenDetail(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [openDetail, openPanel, closePanel]);

  // Primer foco al abrir
  useEffect(() => {
    if (!openPanel) return;
    const t = setTimeout(() => {
      if (firstItemRef.current) {
        firstItemRef.current.focus();
        setActiveIndex(0);
      } else {
        const header = document.getElementById("notif-header");
        (header as HTMLElement | null)?.focus?.();
      }
    }, 30);
    return () => clearTimeout(t);
  }, [openPanel, lastFive.length]);

  // Recalcular posición en desktop
  useLayoutEffect(() => {
    if (!openPanel || isMobile) return;
    const calc = () => {
      const btn = triggerRef.current;
      if (!btn) return;
      setDeskPos(computeDesktopPosition(btn, 384, 10));
    };
    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, true);
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("scroll", calc, true);
    };
  }, [openPanel, isMobile]);

  const handleMarkAll = async () => {
    setPendingAll(true);
    try {
      await markAll();
    } finally {
      setPendingAll(false);
    }
  };

  const handleToggle = () => setOpenPanel((v) => !v);

  // Navegación con ↑/↓/Enter
  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (!lastFive.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(activeIndex < 0 ? 0 : activeIndex + 1, lastFive.length - 1);
      setActiveIndex(next);
      listRef.current?.querySelectorAll<HTMLButtonElement>("[data-item]")[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(activeIndex < 0 ? 0 : activeIndex - 1, 0);
      setActiveIndex(prev);
      listRef.current?.querySelectorAll<HTMLButtonElement>("[data-item]")[prev]?.focus();
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      openItem(lastFive[activeIndex]);
    }
  };

  // ===== Panel (Portal) =====
  const Panel = (
    <Fragment>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] ${isMobile ? "bg-black/40" : "bg-transparent"}`}
        onClick={closePanel}
        aria-hidden="true"
      />
      {isMobile ? (
        // Bottom sheet móvil
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notif-header"
          className="fixed inset-x-0 bottom-0 z-[70] max-h-[80vh] rounded-t-2xl bg-white shadow-2xl border-t border-gray-200 overflow-hidden"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
        >
          {/* Handle + Header */}
          <div className="relative">
            <div className="flex justify-center py-2">
              <span className="h-1.5 w-12 rounded-full bg-gray-200" />
            </div>
            <div
              id="notif-header"
              tabIndex={-1}
              className="flex items-center justify-between px-4 py-3 border-b bg-white text-base font-semibold"
            >
              <span>Notificaciones</span>
              <button onClick={closePanel} aria-label="Cerrar" className="p-2 rounded-md hover:bg-gray-100">
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Acciones */}
          <div className="px-4 py-2 flex items-center gap-3 border-b text-sm">
            <button
              onClick={() => {
                setOpenPanel(false);
                navigate("/notifications");
              }}
              className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Ver todas
            </button>
            <button
              onClick={handleMarkAll}
              disabled={pendingAll || loading}
              className={`px-3 py-1.5 rounded-full ${
                pendingAll ? "bg-gray-100 text-gray-400 cursor-wait" : "bg-blue-600 text-white hover:bg-blue-700"
              } inline-flex items-center gap-2`}
            >
              {pendingAll && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
              Marcar todas
            </button>

            <button
              onClick={() => void reload()}
              disabled={loading}
              className="ml-auto inline-flex items-center gap-2 text-gray-600 hover:text-blue-700"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Actualizando…" : "Refrescar"}
            </button>
          </div>

          {/* Lista */}
          <ul
            ref={listRef}
            className="max-h-[58vh] overflow-y-auto divide-y divide-gray-100 outline-none"
            onKeyDown={onListKeyDown}
          >
            {loading && (
              <li className="p-4">
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-2 h-2 mt-2 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded bg-gray-200" />
                        <div className="h-3 w-1/2 rounded bg-gray-200" />
                      </div>
                    </div>
                  ))}
                </div>
              </li>
            )}

            {!loading && lastFive.length === 0 && (
              <li className="px-6 py-10 text-center text-gray-500 text-sm">
                <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <BellIcon className="w-6 h-6 text-gray-400" />
                </div>
                No hay notificaciones nuevas.
              </li>
            )}

            {!loading &&
              lastFive.map((n, idx) => {
                const isPending = !!pendingMap[n.id];
                const kind = (n.kind as Kind) || "info";
                const styles = KIND_STYLES[kind] ?? KIND_STYLES.info;

                return (
                  <li
                    key={n.id}
                    className={`px-4 py-4 flex items-start gap-3 hover:bg-gray-50 transition ${isPending ? "opacity-60" : ""}`}
                  >
                    <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${styles.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${styles.chip}`}>
                          {n.kind ?? "info"}
                        </span>
                        {n.sensor_uid && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenDetail(false);
                              setOpenPanel(false);
                              navigate(`/notifications?sensor=${encodeURIComponent(n.sensor_uid!)}`);
                            }}
                            className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                            title={`Filtrar por sensor ${n.sensor_uid}`}
                          >
                            Sensor: {n.sensor_uid}
                          </button>
                        )}
                        <span className="ml-auto text-[11px] text-gray-500 shrink-0">{n.timeago}</span>
                      </div>

                      <p className="mt-1 text-[15px] leading-5 font-medium text-gray-900 line-clamp-2">
                        {n.message}
                      </p>

                      <div className="mt-3 flex items-center gap-4">
                        {!n.is_read && (
                          <button
                            onClick={() => void markOne(n.id)}
                            disabled={isPending}
                            className={`text-sm ${isPending ? "text-gray-400 cursor-wait" : "text-blue-600 hover:underline"}`}
                          >
                            Marcar leída
                          </button>
                        )}

                        <button
                          data-item
                          ref={idx === 0 ? firstItemRef : undefined}
                          onClick={() => openItem(n)}
                          className="text-sm text-gray-700 hover:text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded"
                        >
                          Ver detalle
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>

          {/* Footer */}
          <div className="px-4 py-2 border-t text-xs text-gray-600">
            Total: <strong className="text-gray-900">{all.length}</strong> • Sin leer:{" "}
            <strong className="text-blue-700">{unreadCount}</strong>
          </div>
        </div>
      ) : (
        // Desktop: popover anclado al botón (fixed + coords + caret)
        <div
          role="menu"
          aria-labelledby="notif-header"
          className="z-[70] w-[24rem] rounded-xl border border-gray-200 bg-white/90 backdrop-blur-xl shadow-2xl"
          style={{
            position: "fixed",
            top: deskPos?.top ?? 80,
            left: Math.max(
              8,
              Math.min(deskPos?.left ?? 8, window.innerWidth - (deskPos?.width ?? 384) - 8)
            ),
          }}
        >
          {/* caret */}
          {(() => {
            if (!triggerRef.current || !deskPos) return null;
            const btnRect = triggerRef.current.getBoundingClientRect();
            const caretCenter = btnRect.right - 16; // apunta cerca del borde derecho del botón
            const popLeft = deskPos.left;
            const x = Math.max(16, Math.min(caretCenter - popLeft, (deskPos.width ?? 384) - 16));
            // si está por encima del botón (flip vertical), ponemos caret abajo
            const isFlipped = deskPos.top < btnRect.top;
            return (
              <div
                aria-hidden
                className="absolute"
                style={{
                  top: isFlipped ? "100%" : -8,
                  left: x - 8,
                  width: 16,
                  height: 16,
                }}
              >
                <div
                  className={`w-4 h-4 rotate-45 border border-gray-200 bg-white/95 backdrop-blur-sm ${
                    isFlipped ? "translate-y-[-8px]" : ""
                  }`}
                  style={{
                    position: "absolute",
                    top: isFlipped ? -8 : 8,
                    left: 0,
                  }}
                />
              </div>
            );
          })()}

          {/* Header */}
          <div id="notif-header" tabIndex={-1} className="flex items-center justify-between px-4 py-3 border-b">
            <div className="text-sm font-semibold text-gray-800">Notificaciones</div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setOpenPanel(false);
                  navigate("/notifications");
                }}
                className="text-xs text-gray-600 hover:text-gray-900 hover:underline"
              >
                Ver todas
              </button>
              <button
                onClick={handleMarkAll}
                disabled={pendingAll || loading}
                className={`text-xs inline-flex items-center gap-1 ${
                  pendingAll ? "text-gray-400 cursor-wait" : "text-blue-600 hover:underline"
                }`}
              >
                {pendingAll ? (
                  <>
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> Marcando…
                  </>
                ) : (
                  "Marcar todas"
                )}
              </button>
            </div>
          </div>

          {/* Lista */}
          <ul
            ref={listRef}
            className="max-h-[420px] overflow-y-auto divide-y divide-gray-100 outline-none"
            onKeyDown={onListKeyDown}
          >
            {loading && (
              <li className="p-4">
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-2 h-2 mt-2 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded bg-gray-200" />
                        <div className="h-3 w-1/2 rounded bg-gray-200" />
                      </div>
                    </div>
                  ))}
                </div>
              </li>
            )}

            {!loading && lastFive.length === 0 && (
              <li className="px-6 py-10 text-center text-gray-500 text-sm">
                <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <BellIcon className="w-5 h-5 text-gray-400" />
                </div>
                No hay notificaciones nuevas.
              </li>
            )}

            {!loading &&
              lastFive.map((n, idx) => {
                const isPending = !!pendingMap[n.id];
                const kind = (n.kind as Kind) || "info";
                const styles = KIND_STYLES[kind] ?? KIND_STYLES.info;

                return (
                  <li
                    key={n.id}
                    className={`px-4 py-4 flex items-start gap-3 hover:bg-gray-50 transition ${isPending ? "opacity-60" : ""}`}
                  >
                    <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${styles.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${styles.chip}`}>
                          {n.kind ?? "info"}
                        </span>
                        {n.sensor_uid && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenDetail(false);
                              setOpenPanel(false);
                              navigate(`/notifications?sensor=${encodeURIComponent(n.sensor_uid!)}`);
                            }}
                            className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                            title={`Filtrar por sensor ${n.sensor_uid}`}
                          >
                            Sensor: {n.sensor_uid}
                          </button>
                        )}
                        <span className="ml-auto text-[11px] text-gray-500 shrink-0">{n.timeago}</span>
                      </div>

                      <p className="mt-1 text-sm font-medium text-gray-900 line-clamp-2">{n.message}</p>

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

                        <button
                          data-item
                          ref={idx === 0 ? firstItemRef : undefined}
                          onClick={() => openItem(n)}
                          className="text-xs text-gray-600 hover:text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded"
                        >
                          Ver detalle
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t bg-white/90 text-xs text-gray-600">
            <span>
              Total: <strong className="text-gray-900">{all.length}</strong> • Sin leer:{" "}
              <strong className="text-blue-700">{unreadCount}</strong>
            </span>
            <button
              onClick={() => void reload()}
              className="flex items-center gap-1 hover:text-blue-700 disabled:opacity-60"
              disabled={loading}
              aria-live="polite"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Actualizando…" : "Refrescar"}
            </button>
          </div>
        </div>
      )}
    </Fragment>
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
        aria-label="Notificaciones"
        aria-haspopup="dialog"
        aria-expanded={openPanel}
      >
        <BellIcon className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 shadow"
            aria-live="polite"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Portal: evita recortes por overflow/stacking contexts */}
      {openPanel && createPortal(Panel, document.body)}

      <NotificationDetailModal
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        data={selected}
        onMarkRead={async (id) => {
          await markOne(id);
          setSelected((prev) => (prev && prev.id === id ? { ...prev, is_read: true } : prev));
        }}
        onFilterBySensor={(uid) => {
          if (!uid) return;
          setOpenDetail(false);
          setOpenPanel(false);
          navigate(`/notifications?sensor=${encodeURIComponent(uid)}`);
        }}
      />
    </div>
  );
};

export default NotificationBell;
