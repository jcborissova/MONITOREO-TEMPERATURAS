// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

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

  // 🔥 IMPORTANTE PARA iOS/Android (Capacitor)
  base: "",

  server: {
    host: true,             // permite acceso desde iPhone/Android
    port: 5173,
    proxy: {
      "/api": {
        target: "http://155.138.193.120:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
