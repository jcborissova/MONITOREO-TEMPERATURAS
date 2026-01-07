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

  server: {
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
