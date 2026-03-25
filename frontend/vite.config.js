import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Use VITE_PROXY_TARGET for proxy, fallback to localhost:5001
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:5001';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: ['tenanttracker.online'],
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/auth': {
        target: proxyTarget,
        changeOrigin: true,
        bypass(req) {
          // Let the SPA handle OAuth callback routes
          if (req.url.startsWith('/auth/callback')) return req.url;
        },
      },
      '/oauth': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/health': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/uploads': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    css: true,
  },
});
