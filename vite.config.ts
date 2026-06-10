import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Proxy para evitar CORS durante desenvolvimento local
          '/chatwoot-api-v1': {
            target: env.VITE_CHATWOOT_URL || 'https://chatwoot.agenciacaen.com.br',
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/chatwoot-api-v1/, '/api/v1'),
            secure: false,
          },
          '/chatwoot-auth': {
            target: env.VITE_CHATWOOT_URL || 'https://chatwoot.agenciacaen.com.br',
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/chatwoot-auth/, '/auth'),
            secure: false,
          },
          '/chatwoot-api-v2': {
            target: env.VITE_CHATWOOT_URL || 'https://chatwoot.agenciacaen.com.br',
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/chatwoot-api-v2/, '/api/v2'),
            secure: false,
          },
          '/chatwoot-cable': {
            target: env.VITE_CHATWOOT_URL || 'https://chatwoot.agenciacaen.com.br',
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/chatwoot-cable/, '/cable'),
            secure: false,
            ws: true,
          },
        },
      },
      plugins: [tailwindcss(), react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
