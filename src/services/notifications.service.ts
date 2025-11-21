/* eslint-disable @typescript-eslint/no-explicit-any */
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api.config";

/* ============================
   Helper de fecha tipo sensores
   → Forza todo a hora LOCAL
============================ */
const toLocalIsoString = (v: any): string => {
  if (!v) return new Date().toISOString();

  let s = String(v).trim();

  // "2025-11-23 13:22:10" -> "2025-11-23T13:22:10"
  if (s.includes(" ")) s = s.replace(" ", "T");

  // Si termina en Z → se quita (queremos LOCAL)
  if (s.endsWith("Z")) s = s.slice(0, -1);

  const d = new Date(s);
  const ms = d.getTime();

  return Number.isFinite(ms) ? d.toISOString() : new Date().toISOString();
};

/** Lo que devuelve el backend (DTO) */
export interface RawNotification {
  id: number;
  sensor_uid: string | null;
  type: string; // "temperature" | "humidity" | otros
  message: string;
  value?: string | number | null;
  threshold_min?: string | number | null;
  threshold_max?: string | number | null;
  is_read: boolean;
  created_at: string; // ahora siempre ISO localizado
}

/* ============================
   Normalizador de notificaciones
============================= */
const normalize = (list: any[]): RawNotification[] => {
  if (!Array.isArray(list)) return [];

  return list.map((n) => ({
    ...n,
    created_at: toLocalIsoString(n.created_at),
  }));
};

/* ============================
          Servicio
============================= */
export const notificationsService = {
  async getAll(): Promise<RawNotification[]> {
    const res: any = await apiService.get(API_ENDPOINTS.NOTIFICATIONS);
    const arr = Array.isArray(res) ? res : res?.data ?? [];
    return normalize(arr);
  },

  async getUnread(): Promise<RawNotification[]> {
    const res: any = await apiService.get(API_ENDPOINTS.NOTIFICATIONS_UNREAD);
    const arr = Array.isArray(res) ? res : res?.data ?? [];
    return normalize(arr);
  },

  async getBySensor(sensorUid: string): Promise<RawNotification[]> {
    const res: any = await apiService.get(API_ENDPOINTS.NOTIFICATIONS_BY_SENSOR(sensorUid));
    const arr = Array.isArray(res) ? res : res?.data ?? [];
    return normalize(arr);
  },

  async markRead(id: number): Promise<RawNotification> {
    const res: any = await apiService.patch(API_ENDPOINTS.NOTIFICATION_MARK_READ(id), {});
    const obj = res?.data ?? res;

    return {
      ...obj,
      created_at: toLocalIsoString(obj.created_at),
    };
  },

  async markAll(): Promise<void> {
    await apiService.patch(API_ENDPOINTS.NOTIFICATIONS_MARK_ALL, {});
  },
};
