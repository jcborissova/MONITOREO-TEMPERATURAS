import type { RawNotification } from "../services/notifications.service";

/** Tipos normalizados para UI */
export type NotificationKind = "critical" | "warning" | "info" | "success" | "other";

export interface Notification extends RawNotification {
  kind: NotificationKind;
  timeago: string;
}

/** Helpers */
const toNumber = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
};

const computeKind = (n: RawNotification): NotificationKind => {
  const value = toNumber(n.value);
  const tmin = toNumber(n.threshold_min);
  const tmax = toNumber(n.threshold_max);

  // Si tenemos umbrales y valor, inferimos severidad
  if (value != null && (tmin != null || tmax != null)) {
    if ((tmax != null && value > tmax) || (tmin != null && value < tmin)) {
      // si se excede por mucho => critical, si no => warning
      const delta = Math.max(
        tmax != null ? Math.abs(value - tmax) : 0,
        tmin != null ? Math.abs(value - tmin) : 0
      );
      return delta >= 2 ? "critical" : "warning";
    }
    return "success";
  }

  // fallback por tipo
  if (n.type?.toLowerCase().includes("error")) return "critical";
  if (n.type?.toLowerCase().includes("warn")) return "warning";
  if (n.type?.toLowerCase().includes("ok")) return "success";
  return "other";
};

const timeago = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min}m`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
};

export const toNotification = (dto: RawNotification): Notification => ({
  ...dto,
  kind: computeKind(dto),
  timeago: timeago(dto.created_at),
});
