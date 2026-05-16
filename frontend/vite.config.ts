import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || '';

  return {
    plugins: [react()],
    base: '/',
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: apiUrl || 'http://localhost:3000',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              if (req.headers['content-type']?.includes('multipart/form-data')) {
                proxyReq.setHeader('Content-Type', req.headers['content-type']);
              }
            });
          },
        },
        '/uploads': {
          target: apiUrl || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
