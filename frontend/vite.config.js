import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to FastAPI backend in development
      '/api': {
        target: 'https://weapon-ztg5.onrender.com',
        changeOrigin: true,
      },
      '/outputs': {
        target: 'https://weapon-ztg5.onrender.com',
        changeOrigin: true,
      },
      '/ws': {
        target: 'wss://weapon-ztg5.onrender.com',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});

