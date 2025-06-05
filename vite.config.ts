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
});
