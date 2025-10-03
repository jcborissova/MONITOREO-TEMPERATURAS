export const API_CONFIG = {
  baseURL: "http://155.138.193.120:8080", // servidor real
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
};

export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/login",

  // Users
  USERS: "/users",
  USER_BY_ID: (id: number) => `/users/${id}`,

  // Health
  HEALTH: "/health",
};
