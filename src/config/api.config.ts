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
};
