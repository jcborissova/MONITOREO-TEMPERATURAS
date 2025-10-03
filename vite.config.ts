// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        expandProps: "end",
        svgo: true,
        svgoConfig: {
          plugins: [
            { name: "removeViewBox", active: false },
            { name: "cleanupIDs", active: true },
          ],
        },
      },
    }),
  ],
  server: {
    proxy: {
      // todo lo que empiece con /auth -> se manda al backend
      "/auth": {
        target: "http://155.138.193.120:8080",
        changeOrigin: true,
        secure: false,
      },
      "/users": {
        target: "http://155.138.193.120:8080",
        changeOrigin: true,
        secure: false,
      },
      "/health": {
        target: "http://155.138.193.120:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

// 👇 ahora el baseURL apunta a "/" porque el proxy lo resuelve
export const API_CONFIG = {
  baseURL: "/", // usar proxy en desarrollo
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
};

export const API_ENDPOINTS = {
  LOGIN: "/auth/login",
  USERS: "/users",
  USER_BY_ID: (id: number) => `/users/${id}`,
  HEALTH: "/health",
};
