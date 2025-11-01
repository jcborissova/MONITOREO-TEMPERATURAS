// src/config/api.config.ts
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
};

export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/auth/login",

  // Users
  USERS: "/users",
  USER_BY_ID: (id: number) => `/users/${id}`,

  // Health
  HEALTH: "/health",
  SENSORS: "/sensors",
  SENSOR_HISTORY: (devEUI: string) => `/sensors/${devEUI}`,

  NOTIFICATIONS: "/notifications",
  NOTIFICATIONS_UNREAD: "/notifications/unread",
  NOTIFICATIONS_BY_SENSOR: (sensorUid: string) => `/notifications/sensor/${sensorUid}`,
  NOTIFICATION_MARK_READ: (id: number) => `/notifications/${id}/read`,
  NOTIFICATIONS_MARK_ALL: "/notifications/read-all",

  // Thresholds (NUEVO)
  THRESHOLDS: "/thresholds",
  THRESHOLD_BY_ID: (id: number) => `/thresholds/${id}`,
};
