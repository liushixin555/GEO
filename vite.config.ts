import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // SPA fallback: rewrite page navigation requests to index.html
    // before Vite's static file serving intercepts and serves raw .tsx source
    {
      name: 'spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url || '';
          if (
            !url.startsWith('/api') &&
            !url.startsWith('/@') &&
            !url.includes('.') &&
            req.headers.accept?.includes('text/html')
          ) {
            req.url = '/index.html';
          }
          next();
        });
      },
    },
  ],
  root: 'pages',
  resolve: {
    alias: {
      '@pages': path.resolve(__dirname, 'pages'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../dist/pages',
    emptyOutDir: true,
  },
});
