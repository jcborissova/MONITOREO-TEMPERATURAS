export const API_CONFIG = {
  baseURL: "/api", // servidor real
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
