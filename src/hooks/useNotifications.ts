import { useCallback, useEffect, useMemo } from "react";
import { useNotificationsStore, selectors } from "../store/notifications.store";
import { toNotification } from "../utils/notifications";
import type { Notification } from "../utils/notifications";

/** Selector cacheado para sensores (evita bucles por identidad) */
const sensorsSelector = (() => {
  let prevItems: ReturnType<typeof selectors.all> | null = null;
  let prevResult: string[] = [];
  return (s: Parameters<typeof selectors.all>[0]) => {
    const items = selectors.all(s);
    if (items === prevItems) return prevResult;
    prevItems = items;
    prevResult = Array.from(new Set(items.map((n) => n.sensor_uid).filter(Boolean))) as string[];
    return prevResult;
  };
})();

/** Hook principal */
export const useNotifications = (opts?: { pollMs?: number }) => {
  const pollMs = opts?.pollMs ?? 20000;

  const items = useNotificationsStore(selectors.all);
  const loading = useNotificationsStore(selectors.loading);
  const load = useNotificationsStore((s) => s.load);
  const markOne = useNotificationsStore((s) => s.markOne);
  const markAll = useNotificationsStore((s) => s.markAll);

  useEffect(() => { void load(); }, [load]);

  // Poll con visibilidad (sin crear nuevas funciones cada render)
  useEffect(() => {
    let t: number | undefined;
    const tick = async () => {
      if (document.visibilityState === "visible") await load();
      t = window.setTimeout(tick, pollMs);
    };
    t = window.setTimeout(tick, pollMs);
    const onVis = () => {}; // listener estable
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (t) window.clearTimeout(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load, pollMs]);

  const all: Notification[] = useMemo(() => items.map(toNotification), [items]);
  const unreadCount = useMemo(() => all.filter((n) => !n.is_read).length, [all]);
  const reload = useCallback(async () => void load(), [load]);

  return { all, loading, unreadCount, markOne, markAll, reload };
};

/** Mapa completo de pendingIds (para evitar un hook por celda) */
export const usePendingMap = () => useNotificationsStore(selectors.pendingIds);

/** Sensores (memoizados) */
export const useSensors = () => useNotificationsStore(sensorsSelector);
