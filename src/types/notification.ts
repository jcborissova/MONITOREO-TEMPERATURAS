export type NotificationType =
  | "temperature"
  | "humidity"
  | "critical"
  | "warning"
  | "success"
  | "info"
  | string;

export interface NotificationDTO {
  id: number;
  sensor_uid: string | null;
  type: NotificationType;
  message: string;
  value?: string | number | null;
  threshold_min?: string | number | null;
  threshold_max?: string | number | null;
  is_read: boolean;
  created_at: string;
}

export type NotificationKind = "critical" | "warning" | "info" | "success" | "other";

export interface Notification extends NotificationDTO {
  kind: NotificationKind; // derivado de type
  timeago: string;        // “Hace 3 min”, etc.
}
