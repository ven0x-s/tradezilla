import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Baked in at build time: short git SHA (from CI) + build date, shown in the footer.
    __BUILD_SHA__: JSON.stringify((process.env.GIT_SHA || 'dev').slice(0, 7)),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
});
