 

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  // Default más holgado para la mayoría de requests
  timeout: 60000, // 60s (antes 10s)
  headers: {
    "Content-Type": "application/json",
  },
  // 🔑 API Key para creación de usuarios (se lee del .env)
  usersApiKey: import.meta.env.VITE_USERS_API_KEY as string | undefined,
};

// Timeouts sugeridos por tipo de request (puedes ajustar)
export const API_TIMEOUTS = {
  bigRequest: 120000, // 120s para históricos grandes o payloads pesados
  normal: 60000,      // 60s por defecto
  auth: 15000,        // 15s para auth/login
};

export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/auth/login",
  PROFILE: "/auth/profile",

  // Users
  USERS: "/users",
  USER_BY_ID: (id: number | string) => `/users/${id}`,

  // Health
  HEALTH: "/health",

  // Sensores
  SENSORS: "/sensors",
  SENSOR_HISTORY: (devEUI: string) => `/sensors/${devEUI}`,

  // Notificaciones
  NOTIFICATIONS: "/notifications",
  NOTIFICATIONS_UNREAD: "/notifications/unread",
  NOTIFICATIONS_BY_SENSOR: (sensorUid: string) =>
    `/notifications/sensor/${sensorUid}`,
  NOTIFICATION_MARK_READ: (id: number) => `/notifications/${id}/read`,
  NOTIFICATIONS_MARK_ALL: "/notifications/read-all",

  // Thresholds
  THRESHOLDS: "/thresholds",
  THRESHOLD_BY_ID: (id: number) => `/thresholds/${id}`,
};