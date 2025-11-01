/* eslint-disable @typescript-eslint/no-explicit-any */
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api.config";

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
  created_at: string;
}

export const notificationsService = {
  async getAll(): Promise<RawNotification[]> {
    const res: any = await apiService.get(API_ENDPOINTS.NOTIFICATIONS);
    return Array.isArray(res) ? res : res?.data ?? [];
  },

  async getUnread(): Promise<RawNotification[]> {
    const res: any = await apiService.get(API_ENDPOINTS.NOTIFICATIONS_UNREAD);
    return Array.isArray(res) ? res : res?.data ?? [];
  },

  async getBySensor(sensorUid: string): Promise<RawNotification[]> {
    const res: any = await apiService.get(API_ENDPOINTS.NOTIFICATIONS_BY_SENSOR(sensorUid));
    return Array.isArray(res) ? res : res?.data ?? [];
  },

  async markRead(id: number): Promise<RawNotification> {
    const res: any = await apiService.patch(API_ENDPOINTS.NOTIFICATION_MARK_READ(id), {});
    return res?.data ?? res;
  },

  async markAll(): Promise<void> {
    await apiService.patch(API_ENDPOINTS.NOTIFICATIONS_MARK_ALL, {});
  },
};
