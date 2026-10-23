import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const clientDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(clientDir, '..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  const apiPort = env.BANKIDE_PORT || '4000';

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        manifest: false,
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest}'],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: false,
        },
      },
    },
  };
});
