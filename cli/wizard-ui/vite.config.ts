import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: Vite serves the UI on :5173 and proxies /api/* to the wizard server
// on :3737. In production (npm run build) the same files are served by the
// wizard server itself, so the proxy is irrelevant there.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api':    { target: 'http://localhost:3737', changeOrigin: true },
      '/events': { target: 'http://localhost:3737', changeOrigin: true, ws: false },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
